'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _zlib = require('zlib');

var _zlib2 = _interopRequireDefault(_zlib);

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

var _promise = require('./promise');

var _sanitizePaths = require('./sanitize-paths');

var _sanitizePaths2 = _interopRequireDefault(_sanitizePaths);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const d = require('debug')('electron-compile:file-change-cache');

/**
 * This class caches information about files and determines whether they have
 * changed contents or not. Most importantly, this class caches the hash of seen
 * files so that at development time, we don't have to recalculate them constantly.
 *
 * This class is also the core of how electron-compile runs quickly in production
 * mode - after precompilation, the cache is serialized along with the rest of the
 * data in {@link CompilerHost}, so that when we load the app in production mode,
 * we don't end up calculating hashes of file content at all, only using the contents
 * of this cache.
 */
class FileChangedCache {
  constructor(appRoot) {
    let failOnCacheMiss = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

    this.appRoot = (0, _sanitizePaths2.default)(appRoot);

    this.failOnCacheMiss = failOnCacheMiss;
    this.changeCache = {};
  }

  static removePrefix(needle, haystack) {
    let idx = haystack.toLowerCase().indexOf(needle.toLowerCase());
    if (idx < 0) return haystack;

    return haystack.substring(idx + needle.length);
  }

  /**
   * Allows you to create a FileChangedCache from serialized data saved from
   * {@link getSavedData}.
   *
   * @param  {Object} data  Saved data from getSavedData.
   *
   * @param  {string} appRoot  The top-level directory for your application (i.e.
   *                           the one which has your package.json).
   *
   * @param  {boolean} failOnCacheMiss (optional)  If True, cache misses will throw.
   *
   * @return {FileChangedCache}
   */
  static loadFromData(data, appRoot) {
    let failOnCacheMiss = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;

    let ret = new FileChangedCache(appRoot, failOnCacheMiss);
    ret.changeCache = data.changeCache;
    ret.originalAppRoot = data.appRoot;

    return ret;
  }

  /**
   * Allows you to create a FileChangedCache from serialized data saved from
   * {@link save}.
   *
   * @param  {string} file  Saved data from save.
   *
   * @param  {string} appRoot  The top-level directory for your application (i.e.
   *                           the one which has your package.json).
   *
   * @param  {boolean} failOnCacheMiss (optional)  If True, cache misses will throw.
   *
   * @return {Promise<FileChangedCache>}
   */
  static loadFromFile(file, appRoot) {
    let failOnCacheMiss = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
    return _asyncToGenerator(function* () {
      d(`Loading canned FileChangedCache from ${file}`);

      let buf = yield _promise.pfs.readFile(file);
      return FileChangedCache.loadFromData(JSON.parse((yield _promise.pzlib.gunzip(buf))), appRoot, failOnCacheMiss);
    })();
  }

  /**
   * Returns information about a given file, including its hash. This method is
   * the main method for this cache.
   *
   * @param  {string} absoluteFilePath  The path to a file to retrieve info on.
   *
   * @return {Promise<Object>}
   *
   * @property {string} hash  The SHA1 hash of the file
   * @property {boolean} isMinified  True if the file is minified
   * @property {boolean} isInNodeModules  True if the file is in a library directory
   * @property {boolean} hasSourceMap  True if the file has a source map
   * @property {boolean} isFileBinary  True if the file is not a text file
   * @property {Buffer} binaryData (optional)  The buffer that was read if the file
   *                                           was binary and there was a cache miss.
   * @property {string} code (optional)  The string that was read if the file
   *                                     was text and there was a cache miss
   */
  getHashForPath(absoluteFilePath) {
    var _this = this;

    return _asyncToGenerator(function* () {
      var _getCacheEntryForPath = _this.getCacheEntryForPath(absoluteFilePath);

      let cacheEntry = _getCacheEntryForPath.cacheEntry,
          cacheKey = _getCacheEntryForPath.cacheKey;


      if (_this.failOnCacheMiss) {
        return cacheEntry.info;
      }

      var _ref = yield _this.getInfoForCacheEntry(absoluteFilePath);

      let ctime = _ref.ctime,
          size = _ref.size;


      if (cacheEntry) {
        let fileHasChanged = yield _this.hasFileChanged(absoluteFilePath, cacheEntry, { ctime, size });

        if (!fileHasChanged) {
          return cacheEntry.info;
        }

        d(`Invalidating cache entry: ${cacheEntry.ctime} === ${ctime} && ${cacheEntry.size} === ${size}`);
        delete _this.changeCache.cacheEntry;
      }

      var _ref2 = yield _this.calculateHashForFile(absoluteFilePath);

      let digest = _ref2.digest,
          sourceCode = _ref2.sourceCode,
          binaryData = _ref2.binaryData;


      let info = {
        hash: digest,
        isMinified: FileChangedCache.contentsAreMinified(sourceCode || ''),
        isInNodeModules: FileChangedCache.isInNodeModules(absoluteFilePath),
        hasSourceMap: FileChangedCache.hasSourceMap(sourceCode || ''),
        isFileBinary: !!binaryData
      };

      _this.changeCache[cacheKey] = { ctime, size, info };
      d(`Cache entry for ${cacheKey}: ${JSON.stringify(_this.changeCache[cacheKey])}`);

      if (binaryData) {
        return Object.assign({ binaryData }, info);
      } else {
        return Object.assign({ sourceCode }, info);
      }
    })();
  }

  getInfoForCacheEntry(absoluteFilePath) {
    return _asyncToGenerator(function* () {
      let stat = yield _promise.pfs.stat(absoluteFilePath);
      if (!stat || !stat.isFile()) throw new Error(`Can't stat ${absoluteFilePath}`);

      return {
        stat,
        ctime: stat.ctime.getTime(),
        size: stat.size
      };
    })();
  }

  /**
   * Gets the cached data for a file path, if it exists.
   *
   * @param  {string} absoluteFilePath  The path to a file to retrieve info on.
   *
   * @return {Object}
   */
  getCacheEntryForPath(absoluteFilePath) {
    let cacheKey = (0, _sanitizePaths2.default)(absoluteFilePath);
    if (this.appRoot) {
      cacheKey = cacheKey.replace(this.appRoot, '');
    }

    // NB: We do this because x-require will include an absolute path from the
    // original built app and we need to still grok it
    if (this.originalAppRoot) {
      cacheKey = cacheKey.replace(this.originalAppRoot, '');
    }

    let cacheEntry = this.changeCache[cacheKey];

    if (this.failOnCacheMiss) {
      if (!cacheEntry) {
        d(`Tried to read file cache entry for ${absoluteFilePath}`);
        d(`cacheKey: ${cacheKey}, appRoot: ${this.appRoot}, originalAppRoot: ${this.originalAppRoot}`);
        throw new Error(`Asked for ${absoluteFilePath} but it was not precompiled!`);
      }
    }

    return { cacheEntry, cacheKey };
  }

  /**
   * Checks the file cache to see if a file has changed.
   *
   * @param  {string} absoluteFilePath  The path to a file to retrieve info on.
   * @param  {Object} cacheEntry  Cache data from {@link getCacheEntryForPath}
   *
   * @return {boolean}
   */
  hasFileChanged(absoluteFilePath) {
    var _this2 = this;

    let cacheEntry = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    let fileHashInfo = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
    return _asyncToGenerator(function* () {
      cacheEntry = cacheEntry || _this2.getCacheEntryForPath(absoluteFilePath).cacheEntry;
      fileHashInfo = fileHashInfo || (yield _this2.getInfoForCacheEntry(absoluteFilePath));

      if (cacheEntry) {
        return !(cacheEntry.ctime >= fileHashInfo.ctime && cacheEntry.size === fileHashInfo.size);
      }

      return false;
    })();
  }

  /**
   * Returns data that can passed to {@link loadFromData} to rehydrate this cache.
   *
   * @return {Object}
   */
  getSavedData() {
    return { changeCache: this.changeCache, appRoot: this.appRoot };
  }

  /**
   * Serializes this object's data to a file.
   *
   * @param {string} filePath  The path to save data to.
   *
   * @return {Promise} Completion.
   */
  save(filePath) {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      let toSave = _this3.getSavedData();

      let buf = yield _promise.pzlib.gzip(new Buffer(JSON.stringify(toSave)));
      yield _promise.pfs.writeFile(filePath, buf);
    })();
  }

  calculateHashForFile(absoluteFilePath) {
    return _asyncToGenerator(function* () {
      let buf = yield _promise.pfs.readFile(absoluteFilePath);
      let encoding = FileChangedCache.detectFileEncoding(buf);

      if (!encoding) {
        let digest = _crypto2.default.createHash('sha1').update(buf).digest('hex');
        return { sourceCode: null, digest, binaryData: buf };
      }

      let sourceCode = yield _promise.pfs.readFile(absoluteFilePath, encoding);
      let digest = _crypto2.default.createHash('sha1').update(sourceCode, 'utf8').digest('hex');

      return { sourceCode, digest, binaryData: null };
    })();
  }

  getHashForPathSync(absoluteFilePath) {
    let cacheKey = (0, _sanitizePaths2.default)(absoluteFilePath);

    if (this.appRoot) {
      cacheKey = FileChangedCache.removePrefix(this.appRoot, cacheKey);
    }

    // NB: We do this because x-require will include an absolute path from the
    // original built app and we need to still grok it
    if (this.originalAppRoot) {
      cacheKey = FileChangedCache.removePrefix(this.originalAppRoot, cacheKey);
    }

    let cacheEntry = this.changeCache[cacheKey];

    if (this.failOnCacheMiss) {
      if (!cacheEntry) {
        d(`Tried to read file cache entry for ${absoluteFilePath}`);
        d(`cacheKey: ${cacheKey}, appRoot: ${this.appRoot}, originalAppRoot: ${this.originalAppRoot}`);
        throw new Error(`Asked for ${absoluteFilePath} but it was not precompiled!`);
      }

      return cacheEntry.info;
    }

    let stat = _fs2.default.statSync(absoluteFilePath);
    let ctime = stat.ctime.getTime();
    let size = stat.size;
    if (!stat || !stat.isFile()) throw new Error(`Can't stat ${absoluteFilePath}`);

    if (cacheEntry) {
      if (cacheEntry.ctime >= ctime && cacheEntry.size === size) {
        return cacheEntry.info;
      }

      d(`Invalidating cache entry: ${cacheEntry.ctime} === ${ctime} && ${cacheEntry.size} === ${size}`);
      delete this.changeCache.cacheEntry;
    }

    var _calculateHashForFile = this.calculateHashForFileSync(absoluteFilePath);

    let digest = _calculateHashForFile.digest,
        sourceCode = _calculateHashForFile.sourceCode,
        binaryData = _calculateHashForFile.binaryData;


    let info = {
      hash: digest,
      isMinified: FileChangedCache.contentsAreMinified(sourceCode || ''),
      isInNodeModules: FileChangedCache.isInNodeModules(absoluteFilePath),
      hasSourceMap: FileChangedCache.hasSourceMap(sourceCode || ''),
      isFileBinary: !!binaryData
    };

    this.changeCache[cacheKey] = { ctime, size, info };
    d(`Cache entry for ${cacheKey}: ${JSON.stringify(this.changeCache[cacheKey])}`);

    if (binaryData) {
      return Object.assign({ binaryData }, info);
    } else {
      return Object.assign({ sourceCode }, info);
    }
  }

  saveSync(filePath) {
    let toSave = this.getSavedData();

    let buf = _zlib2.default.gzipSync(new Buffer(JSON.stringify(toSave)));
    _fs2.default.writeFileSync(filePath, buf);
  }

  calculateHashForFileSync(absoluteFilePath) {
    let buf = _fs2.default.readFileSync(absoluteFilePath);
    let encoding = FileChangedCache.detectFileEncoding(buf);

    if (!encoding) {
      let digest = _crypto2.default.createHash('sha1').update(buf).digest('hex');
      return { sourceCode: null, digest, binaryData: buf };
    }

    let sourceCode = _fs2.default.readFileSync(absoluteFilePath, encoding);
    let digest = _crypto2.default.createHash('sha1').update(sourceCode, 'utf8').digest('hex');

    return { sourceCode, digest, binaryData: null };
  }

  /**
   * Determines via some statistics whether a file is likely to be minified.
   *
   * @private
   */
  static contentsAreMinified(source) {
    let length = source.length;
    if (length > 1024) length = 1024;

    let newlineCount = 0;

    // Roll through the characters and determine the average line length
    for (let i = 0; i < source.length; i++) {
      if (source[i] === '\n') newlineCount++;
    }

    // No Newlines? Any file other than a super small one is minified
    if (newlineCount === 0) {
      return length > 80;
    }

    let avgLineLength = length / newlineCount;
    return avgLineLength > 80;
  }

  /**
   * Determines whether a path is in node_modules or the Electron init code
   *
   * @private
   */
  static isInNodeModules(filePath) {
    return !!(filePath.match(/(node_modules|bower_components)[\\\/]/i) || filePath.match(/(atom|electron)\.asar/));
  }

  /**
   * Returns whether a file has an inline source map
   *
   * @private
   */
  static hasSourceMap(sourceCode) {
    const trimmed = sourceCode.trim();
    return trimmed.lastIndexOf('//# sourceMap') > trimmed.lastIndexOf('\n');
  }

  /**
   * Determines the encoding of a file from the two most common encodings by trying
   * to decode it then looking for encoding errors
   *
   * @private
   */
  static detectFileEncoding(buffer) {
    if (buffer.length < 1) return false;
    let buf = buffer.length < 4096 ? buffer : buffer.slice(0, 4096);

    const encodings = ['utf8', 'utf16le'];

    let encoding;
    if (buffer.length <= 128) {
      encoding = encodings.find(x => Buffer.compare(new Buffer(buffer.toString(), x), buffer) === 0);
    } else {
      encoding = encodings.find(x => !FileChangedCache.containsControlCharacters(buf.toString(x)));
    }

    return encoding;
  }

  /**
   * Determines whether a string is likely to be poorly encoded by looking for
   * control characters above a certain threshold
   *
   * @private
   */
  static containsControlCharacters(str) {
    let controlCount = 0;
    let spaceCount = 0;
    let threshold = 2;
    if (str.length > 64) threshold = 4;
    if (str.length > 512) threshold = 8;

    for (let i = 0; i < str.length; i++) {
      let c = str.charCodeAt(i);
      if (c === 65536 || c < 8) controlCount++;
      if (c > 14 && c < 32) controlCount++;
      if (c === 32) spaceCount++;

      if (controlCount > threshold) return true;
    }

    if (spaceCount < threshold) return true;

    if (controlCount === 0) return false;
    return controlCount / str.length < 0.02;
  }
}
exports.default = FileChangedCache;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9maWxlLWNoYW5nZS1jYWNoZS5qcyJdLCJuYW1lcyI6WyJkIiwicmVxdWlyZSIsIkZpbGVDaGFuZ2VkQ2FjaGUiLCJjb25zdHJ1Y3RvciIsImFwcFJvb3QiLCJmYWlsT25DYWNoZU1pc3MiLCJjaGFuZ2VDYWNoZSIsInJlbW92ZVByZWZpeCIsIm5lZWRsZSIsImhheXN0YWNrIiwiaWR4IiwidG9Mb3dlckNhc2UiLCJpbmRleE9mIiwic3Vic3RyaW5nIiwibGVuZ3RoIiwibG9hZEZyb21EYXRhIiwiZGF0YSIsInJldCIsIm9yaWdpbmFsQXBwUm9vdCIsImxvYWRGcm9tRmlsZSIsImZpbGUiLCJidWYiLCJyZWFkRmlsZSIsIkpTT04iLCJwYXJzZSIsImd1bnppcCIsImdldEhhc2hGb3JQYXRoIiwiYWJzb2x1dGVGaWxlUGF0aCIsImdldENhY2hlRW50cnlGb3JQYXRoIiwiY2FjaGVFbnRyeSIsImNhY2hlS2V5IiwiaW5mbyIsImdldEluZm9Gb3JDYWNoZUVudHJ5IiwiY3RpbWUiLCJzaXplIiwiZmlsZUhhc0NoYW5nZWQiLCJoYXNGaWxlQ2hhbmdlZCIsImNhbGN1bGF0ZUhhc2hGb3JGaWxlIiwiZGlnZXN0Iiwic291cmNlQ29kZSIsImJpbmFyeURhdGEiLCJoYXNoIiwiaXNNaW5pZmllZCIsImNvbnRlbnRzQXJlTWluaWZpZWQiLCJpc0luTm9kZU1vZHVsZXMiLCJoYXNTb3VyY2VNYXAiLCJpc0ZpbGVCaW5hcnkiLCJzdHJpbmdpZnkiLCJPYmplY3QiLCJhc3NpZ24iLCJzdGF0IiwiaXNGaWxlIiwiRXJyb3IiLCJnZXRUaW1lIiwicmVwbGFjZSIsImZpbGVIYXNoSW5mbyIsImdldFNhdmVkRGF0YSIsInNhdmUiLCJmaWxlUGF0aCIsInRvU2F2ZSIsImd6aXAiLCJCdWZmZXIiLCJ3cml0ZUZpbGUiLCJlbmNvZGluZyIsImRldGVjdEZpbGVFbmNvZGluZyIsImNyZWF0ZUhhc2giLCJ1cGRhdGUiLCJnZXRIYXNoRm9yUGF0aFN5bmMiLCJzdGF0U3luYyIsImNhbGN1bGF0ZUhhc2hGb3JGaWxlU3luYyIsInNhdmVTeW5jIiwiZ3ppcFN5bmMiLCJ3cml0ZUZpbGVTeW5jIiwicmVhZEZpbGVTeW5jIiwic291cmNlIiwibmV3bGluZUNvdW50IiwiaSIsImF2Z0xpbmVMZW5ndGgiLCJtYXRjaCIsInRyaW1tZWQiLCJ0cmltIiwibGFzdEluZGV4T2YiLCJidWZmZXIiLCJzbGljZSIsImVuY29kaW5ncyIsImZpbmQiLCJ4IiwiY29tcGFyZSIsInRvU3RyaW5nIiwiY29udGFpbnNDb250cm9sQ2hhcmFjdGVycyIsInN0ciIsImNvbnRyb2xDb3VudCIsInNwYWNlQ291bnQiLCJ0aHJlc2hvbGQiLCJjIiwiY2hhckNvZGVBdCJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUE7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7O0FBQ0E7Ozs7Ozs7O0FBRUEsTUFBTUEsSUFBSUMsUUFBUSxPQUFSLEVBQWlCLG9DQUFqQixDQUFWOztBQUVBOzs7Ozs7Ozs7OztBQVdlLE1BQU1DLGdCQUFOLENBQXVCO0FBQ3BDQyxjQUFZQyxPQUFaLEVBQTRDO0FBQUEsUUFBdkJDLGVBQXVCLHVFQUFQLEtBQU87O0FBQzFDLFNBQUtELE9BQUwsR0FBZSw2QkFBaUJBLE9BQWpCLENBQWY7O0FBRUEsU0FBS0MsZUFBTCxHQUF1QkEsZUFBdkI7QUFDQSxTQUFLQyxXQUFMLEdBQW1CLEVBQW5CO0FBQ0Q7O0FBRUQsU0FBT0MsWUFBUCxDQUFvQkMsTUFBcEIsRUFBNEJDLFFBQTVCLEVBQXNDO0FBQ3BDLFFBQUlDLE1BQU1ELFNBQVNFLFdBQVQsR0FBdUJDLE9BQXZCLENBQStCSixPQUFPRyxXQUFQLEVBQS9CLENBQVY7QUFDQSxRQUFJRCxNQUFNLENBQVYsRUFBYSxPQUFPRCxRQUFQOztBQUViLFdBQU9BLFNBQVNJLFNBQVQsQ0FBbUJILE1BQU1GLE9BQU9NLE1BQWhDLENBQVA7QUFDRDs7QUFFRDs7Ozs7Ozs7Ozs7OztBQWFBLFNBQU9DLFlBQVAsQ0FBb0JDLElBQXBCLEVBQTBCWixPQUExQixFQUF5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R0FBakIsRUFBc0IrRSxZQUFZLENBQVo7O0FBRXRCLFNBQUssSUFBSWpCLElBQUUsQ0FBWCxFQUFjQSxJQUFJYyxJQUFJNUUsTUFBdEIsRUFBOEI4RCxHQUE5QixFQUFtQztBQUNqQyxVQUFJa0IsSUFBSUosSUFBSUssVUFBSixDQUFlbkIsQ0FBZixDQUFSO0FBQ0EsVUFBSWtCLE1BQU0sS0FBTixJQUFlQSxJQUFJLENBQXZCLEVBQTBCSDtBQUMxQixVQUFJRyxJQUFJLEVBQUosSUFBVUEsSUFBSSxFQUFsQixFQUFzQkg7QUFDdEIsVUFBSUcsTUFBTSxFQUFWLEVBQWNGOztBQUVkLFVBQUlELGVBQWVFLFNBQW5CLEVBQThCLE9BQU8sSUFBUDtBQUMvQjs7QUFFRCxRQUFJRCxhQUFhQyxTQUFqQixFQUE0QixPQUFPLElBQVA7O0FBRTVCLFFBQUlGLGlCQUFpQixDQUFyQixFQUF3QixPQUFPLEtBQVA7QUFDeEIsV0FBUUEsZUFBZUQsSUFBSTVFLE1BQXBCLEdBQThCLElBQXJDO0FBQ0Q7QUExWW1DO2tCQUFqQlosZ0IiLCJmaWxlIjoiZmlsZS1jaGFuZ2UtY2FjaGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZnMgZnJvbSAnZnMnO1xyXG5pbXBvcnQgemxpYiBmcm9tICd6bGliJztcclxuaW1wb3J0IGNyeXB0byBmcm9tICdjcnlwdG8nO1xyXG5pbXBvcnQge3BmcywgcHpsaWJ9IGZyb20gJy4vcHJvbWlzZSc7XHJcbmltcG9ydCBzYW5pdGl6ZUZpbGVQYXRoIGZyb20gJy4vc2FuaXRpemUtcGF0aHMnO1xyXG5cclxuY29uc3QgZCA9IHJlcXVpcmUoJ2RlYnVnJykoJ2VsZWN0cm9uLWNvbXBpbGU6ZmlsZS1jaGFuZ2UtY2FjaGUnKTtcclxuXHJcbi8qKlxyXG4gKiBUaGlzIGNsYXNzIGNhY2hlcyBpbmZvcm1hdGlvbiBhYm91dCBmaWxlcyBhbmQgZGV0ZXJtaW5lcyB3aGV0aGVyIHRoZXkgaGF2ZVxyXG4gKiBjaGFuZ2VkIGNvbnRlbnRzIG9yIG5vdC4gTW9zdCBpbXBvcnRhbnRseSwgdGhpcyBjbGFzcyBjYWNoZXMgdGhlIGhhc2ggb2Ygc2VlblxyXG4gKiBmaWxlcyBzbyB0aGF0IGF0IGRldmVsb3BtZW50IHRpbWUsIHdlIGRvbid0IGhhdmUgdG8gcmVjYWxjdWxhdGUgdGhlbSBjb25zdGFudGx5LlxyXG4gKlxyXG4gKiBUaGlzIGNsYXNzIGlzIGFsc28gdGhlIGNvcmUgb2YgaG93IGVsZWN0cm9uLWNvbXBpbGUgcnVucyBxdWlja2x5IGluIHByb2R1Y3Rpb25cclxuICogbW9kZSAtIGFmdGVyIHByZWNvbXBpbGF0aW9uLCB0aGUgY2FjaGUgaXMgc2VyaWFsaXplZCBhbG9uZyB3aXRoIHRoZSByZXN0IG9mIHRoZVxyXG4gKiBkYXRhIGluIHtAbGluayBDb21waWxlckhvc3R9LCBzbyB0aGF0IHdoZW4gd2UgbG9hZCB0aGUgYXBwIGluIHByb2R1Y3Rpb24gbW9kZSxcclxuICogd2UgZG9uJ3QgZW5kIHVwIGNhbGN1bGF0aW5nIGhhc2hlcyBvZiBmaWxlIGNvbnRlbnQgYXQgYWxsLCBvbmx5IHVzaW5nIHRoZSBjb250ZW50c1xyXG4gKiBvZiB0aGlzIGNhY2hlLlxyXG4gKi9cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRmlsZUNoYW5nZWRDYWNoZSB7XHJcbiAgY29uc3RydWN0b3IoYXBwUm9vdCwgZmFpbE9uQ2FjaGVNaXNzPWZhbHNlKSB7XHJcbiAgICB0aGlzLmFwcFJvb3QgPSBzYW5pdGl6ZUZpbGVQYXRoKGFwcFJvb3QpO1xyXG5cclxuICAgIHRoaXMuZmFpbE9uQ2FjaGVNaXNzID0gZmFpbE9uQ2FjaGVNaXNzO1xyXG4gICAgdGhpcy5jaGFuZ2VDYWNoZSA9IHt9O1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIHJlbW92ZVByZWZpeChuZWVkbGUsIGhheXN0YWNrKSB7XHJcbiAgICBsZXQgaWR4ID0gaGF5c3RhY2sudG9Mb3dlckNhc2UoKS5pbmRleE9mKG5lZWRsZS50b0xvd2VyQ2FzZSgpKTtcclxuICAgIGlmIChpZHggPCAwKSByZXR1cm4gaGF5c3RhY2s7XHJcblxyXG4gICAgcmV0dXJuIGhheXN0YWNrLnN1YnN0cmluZyhpZHggKyBuZWVkbGUubGVuZ3RoKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEFsbG93cyB5b3UgdG8gY3JlYXRlIGEgRmlsZUNoYW5nZWRDYWNoZSBmcm9tIHNlcmlhbGl6ZWQgZGF0YSBzYXZlZCBmcm9tXHJcbiAgICoge0BsaW5rIGdldFNhdmVkRGF0YX0uXHJcbiAgICpcclxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGRhdGEgIFNhdmVkIGRhdGEgZnJvbSBnZXRTYXZlZERhdGEuXHJcbiAgICpcclxuICAgKiBAcGFyYW0gIHtzdHJpbmd9IGFwcFJvb3QgIFRoZSB0b3AtbGV2ZWwgZGlyZWN0b3J5IGZvciB5b3VyIGFwcGxpY2F0aW9uIChpLmUuXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICB0aGUgb25lIHdoaWNoIGhhcyB5b3VyIHBhY2thZ2UuanNvbikuXHJcbiAgICpcclxuICAgKiBAcGFyYW0gIHtib29sZWFufSBmYWlsT25DYWNoZU1pc3MgKG9wdGlvbmFsKSAgSWYgVHJ1ZSwgY2FjaGUgbWlzc2VzIHdpbGwgdGhyb3cuXHJcbiAgICpcclxuICAgKiBAcmV0dXJuIHtGaWxlQ2hhbmdlZENhY2hlfVxyXG4gICAqL1xyXG4gIHN0YXRpYyBsb2FkRnJvbURhdGEoZGF0YSwgYXBwUm9vdCwgZmFpbE9uQ2FjaGVNaXNzPXRydWUpIHtcclxuICAgIGxldCByZXQgPSBuZXcgRmlsZUNoYW5nZWRDYWNoZShhcHBSb290LCBmYWlsT25DYWNoZU1pc3MpO1xyXG4gICAgcmV0LmNoYW5nZUNhY2hlID0gZGF0YS5jaGFuZ2VDYWNoZTtcclxuICAgIHJldC5vcmlnaW5hbEFwcFJvb3QgPSBkYXRhLmFwcFJvb3Q7XHJcblxyXG4gICAgcmV0dXJuIHJldDtcclxuICB9XHJcblxyXG5cclxuICAvKipcclxuICAgKiBBbGxvd3MgeW91IHRvIGNyZWF0ZSBhIEZpbGVDaGFuZ2VkQ2FjaGUgZnJvbSBzZXJpYWxpemVkIGRhdGEgc2F2ZWQgZnJvbVxyXG4gICAqIHtAbGluayBzYXZlfS5cclxuICAgKlxyXG4gICAqIEBwYXJhbSAge3N0cmluZ30gZmlsZSAgU2F2ZWQgZGF0YSBmcm9tIHNhdmUuXHJcbiAgICpcclxuICAgKiBAcGFyYW0gIHtzdHJpbmd9IGFwcFJvb3QgIFRoZSB0b3AtbGV2ZWwgZGlyZWN0b3J5IGZvciB5b3VyIGFwcGxpY2F0aW9uIChpLmUuXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICB0aGUgb25lIHdoaWNoIGhhcyB5b3VyIHBhY2thZ2UuanNvbikuXHJcbiAgICpcclxuICAgKiBAcGFyYW0gIHtib29sZWFufSBmYWlsT25DYWNoZU1pc3MgKG9wdGlvbmFsKSAgSWYgVHJ1ZSwgY2FjaGUgbWlzc2VzIHdpbGwgdGhyb3cuXHJcbiAgICpcclxuICAgKiBAcmV0dXJuIHtQcm9taXNlPEZpbGVDaGFuZ2VkQ2FjaGU+fVxyXG4gICAqL1xyXG4gIHN0YXRpYyBhc3luYyBsb2FkRnJvbUZpbGUoZmlsZSwgYXBwUm9vdCwgZmFpbE9uQ2FjaGVNaXNzPXRydWUpIHtcclxuICAgIGQoYExvYWRpbmcgY2FubmVkIEZpbGVDaGFuZ2VkQ2FjaGUgZnJvbSAke2ZpbGV9YCk7XHJcblxyXG4gICAgbGV0IGJ1ZiA9IGF3YWl0IHBmcy5yZWFkRmlsZShmaWxlKTtcclxuICAgIHJldHVybiBGaWxlQ2hhbmdlZENhY2hlLmxvYWRGcm9tRGF0YShKU09OLnBhcnNlKGF3YWl0IHB6bGliLmd1bnppcChidWYpKSwgYXBwUm9vdCwgZmFpbE9uQ2FjaGVNaXNzKTtcclxuICB9XHJcblxyXG5cclxuICAvKipcclxuICAgKiBSZXR1cm5zIGluZm9ybWF0aW9uIGFib3V0IGEgZ2l2ZW4gZmlsZSwgaW5jbHVkaW5nIGl0cyBoYXNoLiBUaGlzIG1ldGhvZCBpc1xyXG4gICAqIHRoZSBtYWluIG1ldGhvZCBmb3IgdGhpcyBjYWNoZS5cclxuICAgKlxyXG4gICAqIEBwYXJhbSAge3N0cmluZ30gYWJzb2x1dGVGaWxlUGF0aCAgVGhlIHBhdGggdG8gYSBmaWxlIHRvIHJldHJpZXZlIGluZm8gb24uXHJcbiAgICpcclxuICAgKiBAcmV0dXJuIHtQcm9taXNlPE9iamVjdD59XHJcbiAgICpcclxuICAgKiBAcHJvcGVydHkge3N0cmluZ30gaGFzaCAgVGhlIFNIQTEgaGFzaCBvZiB0aGUgZmlsZVxyXG4gICAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gaXNNaW5pZmllZCAgVHJ1ZSBpZiB0aGUgZmlsZSBpcyBtaW5pZmllZFxyXG4gICAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gaXNJbk5vZGVNb2R1bGVzICBUcnVlIGlmIHRoZSBmaWxlIGlzIGluIGEgbGlicmFyeSBkaXJlY3RvcnlcclxuICAgKiBAcHJvcGVydHkge2Jvb2xlYW59IGhhc1NvdXJjZU1hcCAgVHJ1ZSBpZiB0aGUgZmlsZSBoYXMgYSBzb3VyY2UgbWFwXHJcbiAgICogQHByb3BlcnR5IHtib29sZWFufSBpc0ZpbGVCaW5hcnkgIFRydWUgaWYgdGhlIGZpbGUgaXMgbm90IGEgdGV4dCBmaWxlXHJcbiAgICogQHByb3BlcnR5IHtCdWZmZXJ9IGJpbmFyeURhdGEgKG9wdGlvbmFsKSAgVGhlIGJ1ZmZlciB0aGF0IHdhcyByZWFkIGlmIHRoZSBmaWxlXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2FzIGJpbmFyeSBhbmQgdGhlcmUgd2FzIGEgY2FjaGUgbWlzcy5cclxuICAgKiBAcHJvcGVydHkge3N0cmluZ30gY29kZSAob3B0aW9uYWwpICBUaGUgc3RyaW5nIHRoYXQgd2FzIHJlYWQgaWYgdGhlIGZpbGVcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3YXMgdGV4dCBhbmQgdGhlcmUgd2FzIGEgY2FjaGUgbWlzc1xyXG4gICAqL1xyXG4gIGFzeW5jIGdldEhhc2hGb3JQYXRoKGFic29sdXRlRmlsZVBhdGgpIHtcclxuICAgIGxldCB7Y2FjaGVFbnRyeSwgY2FjaGVLZXl9ID0gdGhpcy5nZXRDYWNoZUVudHJ5Rm9yUGF0aChhYnNvbHV0ZUZpbGVQYXRoKTtcclxuXHJcbiAgICBpZiAodGhpcy5mYWlsT25DYWNoZU1pc3MpIHtcclxuICAgICAgcmV0dXJuIGNhY2hlRW50cnkuaW5mbztcclxuICAgIH1cclxuXHJcbiAgICBsZXQge2N0aW1lLCBzaXplfSA9IGF3YWl0IHRoaXMuZ2V0SW5mb0ZvckNhY2hlRW50cnkoYWJzb2x1dGVGaWxlUGF0aCk7XHJcblxyXG4gICAgaWYgKGNhY2hlRW50cnkpIHtcclxuICAgICAgbGV0IGZpbGVIYXNDaGFuZ2VkID0gYXdhaXQgdGhpcy5oYXNGaWxlQ2hhbmdlZChhYnNvbHV0ZUZpbGVQYXRoLCBjYWNoZUVudHJ5LCB7Y3RpbWUsIHNpemV9KTtcclxuXHJcbiAgICAgIGlmICghZmlsZUhhc0NoYW5nZWQpIHtcclxuICAgICAgICByZXR1cm4gY2FjaGVFbnRyeS5pbmZvO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBkKGBJbnZhbGlkYXRpbmcgY2FjaGUgZW50cnk6ICR7Y2FjaGVFbnRyeS5jdGltZX0gPT09ICR7Y3RpbWV9ICYmICR7Y2FjaGVFbnRyeS5zaXplfSA9PT0gJHtzaXplfWApO1xyXG4gICAgICBkZWxldGUgdGhpcy5jaGFuZ2VDYWNoZS5jYWNoZUVudHJ5O1xyXG4gICAgfVxyXG5cclxuICAgIGxldCB7ZGlnZXN0LCBzb3VyY2VDb2RlLCBiaW5hcnlEYXRhfSA9IGF3YWl0IHRoaXMuY2FsY3VsYXRlSGFzaEZvckZpbGUoYWJzb2x1dGVGaWxlUGF0aCk7XHJcblxyXG4gICAgbGV0IGluZm8gPSB7XHJcbiAgICAgIGhhc2g6IGRpZ2VzdCxcclxuICAgICAgaXNNaW5pZmllZDogRmlsZUNoYW5nZWRDYWNoZS5jb250ZW50c0FyZU1pbmlmaWVkKHNvdXJjZUNvZGUgfHwgJycpLFxyXG4gICAgICBpc0luTm9kZU1vZHVsZXM6IEZpbGVDaGFuZ2VkQ2FjaGUuaXNJbk5vZGVNb2R1bGVzKGFic29sdXRlRmlsZVBhdGgpLFxyXG4gICAgICBoYXNTb3VyY2VNYXA6IEZpbGVDaGFuZ2VkQ2FjaGUuaGFzU291cmNlTWFwKHNvdXJjZUNvZGUgfHwgJycpLFxyXG4gICAgICBpc0ZpbGVCaW5hcnk6ICEhYmluYXJ5RGF0YVxyXG4gICAgfTtcclxuXHJcbiAgICB0aGlzLmNoYW5nZUNhY2hlW2NhY2hlS2V5XSA9IHsgY3RpbWUsIHNpemUsIGluZm8gfTtcclxuICAgIGQoYENhY2hlIGVudHJ5IGZvciAke2NhY2hlS2V5fTogJHtKU09OLnN0cmluZ2lmeSh0aGlzLmNoYW5nZUNhY2hlW2NhY2hlS2V5XSl9YCk7XHJcblxyXG4gICAgaWYgKGJpbmFyeURhdGEpIHtcclxuICAgICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oe2JpbmFyeURhdGF9LCBpbmZvKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiBPYmplY3QuYXNzaWduKHtzb3VyY2VDb2RlfSwgaW5mbyk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBhc3luYyBnZXRJbmZvRm9yQ2FjaGVFbnRyeShhYnNvbHV0ZUZpbGVQYXRoKSB7XHJcbiAgICBsZXQgc3RhdCA9IGF3YWl0IHBmcy5zdGF0KGFic29sdXRlRmlsZVBhdGgpO1xyXG4gICAgaWYgKCFzdGF0IHx8ICFzdGF0LmlzRmlsZSgpKSB0aHJvdyBuZXcgRXJyb3IoYENhbid0IHN0YXQgJHthYnNvbHV0ZUZpbGVQYXRofWApO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXQsXHJcbiAgICAgIGN0aW1lOiBzdGF0LmN0aW1lLmdldFRpbWUoKSxcclxuICAgICAgc2l6ZTogc3RhdC5zaXplXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0cyB0aGUgY2FjaGVkIGRhdGEgZm9yIGEgZmlsZSBwYXRoLCBpZiBpdCBleGlzdHMuXHJcbiAgICpcclxuICAgKiBAcGFyYW0gIHtzdHJpbmd9IGFic29sdXRlRmlsZVBhdGggIFRoZSBwYXRoIHRvIGEgZmlsZSB0byByZXRyaWV2ZSBpbmZvIG9uLlxyXG4gICAqXHJcbiAgICogQHJldHVybiB7T2JqZWN0fVxyXG4gICAqL1xyXG4gIGdldENhY2hlRW50cnlGb3JQYXRoKGFic29sdXRlRmlsZVBhdGgpIHtcclxuICAgIGxldCBjYWNoZUtleSA9IHNhbml0aXplRmlsZVBhdGgoYWJzb2x1dGVGaWxlUGF0aCk7XHJcbiAgICBpZiAodGhpcy5hcHBSb290KSB7XHJcbiAgICAgIGNhY2hlS2V5ID0gY2FjaGVLZXkucmVwbGFjZSh0aGlzLmFwcFJvb3QsICcnKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBOQjogV2UgZG8gdGhpcyBiZWNhdXNlIHgtcmVxdWlyZSB3aWxsIGluY2x1ZGUgYW4gYWJzb2x1dGUgcGF0aCBmcm9tIHRoZVxyXG4gICAgLy8gb3JpZ2luYWwgYnVpbHQgYXBwIGFuZCB3ZSBuZWVkIHRvIHN0aWxsIGdyb2sgaXRcclxuICAgIGlmICh0aGlzLm9yaWdpbmFsQXBwUm9vdCkge1xyXG4gICAgICBjYWNoZUtleSA9IGNhY2hlS2V5LnJlcGxhY2UodGhpcy5vcmlnaW5hbEFwcFJvb3QsICcnKTtcclxuICAgIH1cclxuXHJcbiAgICBsZXQgY2FjaGVFbnRyeSA9IHRoaXMuY2hhbmdlQ2FjaGVbY2FjaGVLZXldO1xyXG5cclxuICAgIGlmICh0aGlzLmZhaWxPbkNhY2hlTWlzcykge1xyXG4gICAgICBpZiAoIWNhY2hlRW50cnkpIHtcclxuICAgICAgICBkKGBUcmllZCB0byByZWFkIGZpbGUgY2FjaGUgZW50cnkgZm9yICR7YWJzb2x1dGVGaWxlUGF0aH1gKTtcclxuICAgICAgICBkKGBjYWNoZUtleTogJHtjYWNoZUtleX0sIGFwcFJvb3Q6ICR7dGhpcy5hcHBSb290fSwgb3JpZ2luYWxBcHBSb290OiAke3RoaXMub3JpZ2luYWxBcHBSb290fWApO1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgQXNrZWQgZm9yICR7YWJzb2x1dGVGaWxlUGF0aH0gYnV0IGl0IHdhcyBub3QgcHJlY29tcGlsZWQhYCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ge2NhY2hlRW50cnksIGNhY2hlS2V5fTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENoZWNrcyB0aGUgZmlsZSBjYWNoZSB0byBzZWUgaWYgYSBmaWxlIGhhcyBjaGFuZ2VkLlxyXG4gICAqXHJcbiAgICogQHBhcmFtICB7c3RyaW5nfSBhYnNvbHV0ZUZpbGVQYXRoICBUaGUgcGF0aCB0byBhIGZpbGUgdG8gcmV0cmlldmUgaW5mbyBvbi5cclxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGNhY2hlRW50cnkgIENhY2hlIGRhdGEgZnJvbSB7QGxpbmsgZ2V0Q2FjaGVFbnRyeUZvclBhdGh9XHJcbiAgICpcclxuICAgKiBAcmV0dXJuIHtib29sZWFufVxyXG4gICAqL1xyXG4gIGFzeW5jIGhhc0ZpbGVDaGFuZ2VkKGFic29sdXRlRmlsZVBhdGgsIGNhY2hlRW50cnk9bnVsbCwgZmlsZUhhc2hJbmZvPW51bGwpIHtcclxuICAgIGNhY2hlRW50cnkgPSBjYWNoZUVudHJ5IHx8IHRoaXMuZ2V0Q2FjaGVFbnRyeUZvclBhdGgoYWJzb2x1dGVGaWxlUGF0aCkuY2FjaGVFbnRyeTtcclxuICAgIGZpbGVIYXNoSW5mbyA9IGZpbGVIYXNoSW5mbyB8fCBhd2FpdCB0aGlzLmdldEluZm9Gb3JDYWNoZUVudHJ5KGFic29sdXRlRmlsZVBhdGgpO1xyXG5cclxuICAgIGlmIChjYWNoZUVudHJ5KSB7XHJcbiAgICAgIHJldHVybiAhKGNhY2hlRW50cnkuY3RpbWUgPj0gZmlsZUhhc2hJbmZvLmN0aW1lICYmIGNhY2hlRW50cnkuc2l6ZSA9PT0gZmlsZUhhc2hJbmZvLnNpemUpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFJldHVybnMgZGF0YSB0aGF0IGNhbiBwYXNzZWQgdG8ge0BsaW5rIGxvYWRGcm9tRGF0YX0gdG8gcmVoeWRyYXRlIHRoaXMgY2FjaGUuXHJcbiAgICpcclxuICAgKiBAcmV0dXJuIHtPYmplY3R9XHJcbiAgICovXHJcbiAgZ2V0U2F2ZWREYXRhKCkge1xyXG4gICAgcmV0dXJuIHsgY2hhbmdlQ2FjaGU6IHRoaXMuY2hhbmdlQ2FjaGUsIGFwcFJvb3Q6IHRoaXMuYXBwUm9vdCB9O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU2VyaWFsaXplcyB0aGlzIG9iamVjdCdzIGRhdGEgdG8gYSBmaWxlLlxyXG4gICAqXHJcbiAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVQYXRoICBUaGUgcGF0aCB0byBzYXZlIGRhdGEgdG8uXHJcbiAgICpcclxuICAgKiBAcmV0dXJuIHtQcm9taXNlfSBDb21wbGV0aW9uLlxyXG4gICAqL1xyXG4gIGFzeW5jIHNhdmUoZmlsZVBhdGgpIHtcclxuICAgIGxldCB0b1NhdmUgPSB0aGlzLmdldFNhdmVkRGF0YSgpO1xyXG5cclxuICAgIGxldCBidWYgPSBhd2FpdCBwemxpYi5nemlwKG5ldyBCdWZmZXIoSlNPTi5zdHJpbmdpZnkodG9TYXZlKSkpO1xyXG4gICAgYXdhaXQgcGZzLndyaXRlRmlsZShmaWxlUGF0aCwgYnVmKTtcclxuICB9XHJcblxyXG4gIGFzeW5jIGNhbGN1bGF0ZUhhc2hGb3JGaWxlKGFic29sdXRlRmlsZVBhdGgpIHtcclxuICAgIGxldCBidWYgPSBhd2FpdCBwZnMucmVhZEZpbGUoYWJzb2x1dGVGaWxlUGF0aCk7XHJcbiAgICBsZXQgZW5jb2RpbmcgPSBGaWxlQ2hhbmdlZENhY2hlLmRldGVjdEZpbGVFbmNvZGluZyhidWYpO1xyXG5cclxuICAgIGlmICghZW5jb2RpbmcpIHtcclxuICAgICAgbGV0IGRpZ2VzdCA9IGNyeXB0by5jcmVhdGVIYXNoKCdzaGExJykudXBkYXRlKGJ1ZikuZGlnZXN0KCdoZXgnKTtcclxuICAgICAgcmV0dXJuIHsgc291cmNlQ29kZTogbnVsbCwgZGlnZXN0LCBiaW5hcnlEYXRhOiBidWYgfTtcclxuICAgIH1cclxuXHJcbiAgICBsZXQgc291cmNlQ29kZSA9IGF3YWl0IHBmcy5yZWFkRmlsZShhYnNvbHV0ZUZpbGVQYXRoLCBlbmNvZGluZyk7XHJcbiAgICBsZXQgZGlnZXN0ID0gY3J5cHRvLmNyZWF0ZUhhc2goJ3NoYTEnKS51cGRhdGUoc291cmNlQ29kZSwgJ3V0ZjgnKS5kaWdlc3QoJ2hleCcpO1xyXG5cclxuICAgIHJldHVybiB7c291cmNlQ29kZSwgZGlnZXN0LCBiaW5hcnlEYXRhOiBudWxsIH07XHJcbiAgfVxyXG5cclxuICBnZXRIYXNoRm9yUGF0aFN5bmMoYWJzb2x1dGVGaWxlUGF0aCkge1xyXG4gICAgbGV0IGNhY2hlS2V5ID0gc2FuaXRpemVGaWxlUGF0aChhYnNvbHV0ZUZpbGVQYXRoKTtcclxuXHJcbiAgICBpZiAodGhpcy5hcHBSb290KSB7XHJcbiAgICAgIGNhY2hlS2V5ID0gRmlsZUNoYW5nZWRDYWNoZS5yZW1vdmVQcmVmaXgodGhpcy5hcHBSb290LCBjYWNoZUtleSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gTkI6IFdlIGRvIHRoaXMgYmVjYXVzZSB4LXJlcXVpcmUgd2lsbCBpbmNsdWRlIGFuIGFic29sdXRlIHBhdGggZnJvbSB0aGVcclxuICAgIC8vIG9yaWdpbmFsIGJ1aWx0IGFwcCBhbmQgd2UgbmVlZCB0byBzdGlsbCBncm9rIGl0XHJcbiAgICBpZiAodGhpcy5vcmlnaW5hbEFwcFJvb3QpIHtcclxuICAgICAgY2FjaGVLZXkgPSBGaWxlQ2hhbmdlZENhY2hlLnJlbW92ZVByZWZpeCh0aGlzLm9yaWdpbmFsQXBwUm9vdCwgY2FjaGVLZXkpO1xyXG4gICAgfVxyXG5cclxuICAgIGxldCBjYWNoZUVudHJ5ID0gdGhpcy5jaGFuZ2VDYWNoZVtjYWNoZUtleV07XHJcblxyXG4gICAgaWYgKHRoaXMuZmFpbE9uQ2FjaGVNaXNzKSB7XHJcbiAgICAgIGlmICghY2FjaGVFbnRyeSkge1xyXG4gICAgICAgIGQoYFRyaWVkIHRvIHJlYWQgZmlsZSBjYWNoZSBlbnRyeSBmb3IgJHthYnNvbHV0ZUZpbGVQYXRofWApO1xyXG4gICAgICAgIGQoYGNhY2hlS2V5OiAke2NhY2hlS2V5fSwgYXBwUm9vdDogJHt0aGlzLmFwcFJvb3R9LCBvcmlnaW5hbEFwcFJvb3Q6ICR7dGhpcy5vcmlnaW5hbEFwcFJvb3R9YCk7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBBc2tlZCBmb3IgJHthYnNvbHV0ZUZpbGVQYXRofSBidXQgaXQgd2FzIG5vdCBwcmVjb21waWxlZCFgKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuIGNhY2hlRW50cnkuaW5mbztcclxuICAgIH1cclxuXHJcbiAgICBsZXQgc3RhdCA9IGZzLnN0YXRTeW5jKGFic29sdXRlRmlsZVBhdGgpO1xyXG4gICAgbGV0IGN0aW1lID0gc3RhdC5jdGltZS5nZXRUaW1lKCk7XHJcbiAgICBsZXQgc2l6ZSA9IHN0YXQuc2l6ZTtcclxuICAgIGlmICghc3RhdCB8fCAhc3RhdC5pc0ZpbGUoKSkgdGhyb3cgbmV3IEVycm9yKGBDYW4ndCBzdGF0ICR7YWJzb2x1dGVGaWxlUGF0aH1gKTtcclxuXHJcbiAgICBpZiAoY2FjaGVFbnRyeSkge1xyXG4gICAgICBpZiAoY2FjaGVFbnRyeS5jdGltZSA+PSBjdGltZSAmJiBjYWNoZUVudHJ5LnNpemUgPT09IHNpemUpIHtcclxuICAgICAgICByZXR1cm4gY2FjaGVFbnRyeS5pbmZvO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBkKGBJbnZhbGlkYXRpbmcgY2FjaGUgZW50cnk6ICR7Y2FjaGVFbnRyeS5jdGltZX0gPT09ICR7Y3RpbWV9ICYmICR7Y2FjaGVFbnRyeS5zaXplfSA9PT0gJHtzaXplfWApO1xyXG4gICAgICBkZWxldGUgdGhpcy5jaGFuZ2VDYWNoZS5jYWNoZUVudHJ5O1xyXG4gICAgfVxyXG5cclxuICAgIGxldCB7ZGlnZXN0LCBzb3VyY2VDb2RlLCBiaW5hcnlEYXRhfSA9IHRoaXMuY2FsY3VsYXRlSGFzaEZvckZpbGVTeW5jKGFic29sdXRlRmlsZVBhdGgpO1xyXG5cclxuICAgIGxldCBpbmZvID0ge1xyXG4gICAgICBoYXNoOiBkaWdlc3QsXHJcbiAgICAgIGlzTWluaWZpZWQ6IEZpbGVDaGFuZ2VkQ2FjaGUuY29udGVudHNBcmVNaW5pZmllZChzb3VyY2VDb2RlIHx8ICcnKSxcclxuICAgICAgaXNJbk5vZGVNb2R1bGVzOiBGaWxlQ2hhbmdlZENhY2hlLmlzSW5Ob2RlTW9kdWxlcyhhYnNvbHV0ZUZpbGVQYXRoKSxcclxuICAgICAgaGFzU291cmNlTWFwOiBGaWxlQ2hhbmdlZENhY2hlLmhhc1NvdXJjZU1hcChzb3VyY2VDb2RlIHx8ICcnKSxcclxuICAgICAgaXNGaWxlQmluYXJ5OiAhIWJpbmFyeURhdGFcclxuICAgIH07XHJcblxyXG4gICAgdGhpcy5jaGFuZ2VDYWNoZVtjYWNoZUtleV0gPSB7IGN0aW1lLCBzaXplLCBpbmZvIH07XHJcbiAgICBkKGBDYWNoZSBlbnRyeSBmb3IgJHtjYWNoZUtleX06ICR7SlNPTi5zdHJpbmdpZnkodGhpcy5jaGFuZ2VDYWNoZVtjYWNoZUtleV0pfWApO1xyXG5cclxuICAgIGlmIChiaW5hcnlEYXRhKSB7XHJcbiAgICAgIHJldHVybiBPYmplY3QuYXNzaWduKHtiaW5hcnlEYXRhfSwgaW5mbyk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7c291cmNlQ29kZX0sIGluZm8pO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgc2F2ZVN5bmMoZmlsZVBhdGgpIHtcclxuICAgIGxldCB0b1NhdmUgPSB0aGlzLmdldFNhdmVkRGF0YSgpO1xyXG5cclxuICAgIGxldCBidWYgPSB6bGliLmd6aXBTeW5jKG5ldyBCdWZmZXIoSlNPTi5zdHJpbmdpZnkodG9TYXZlKSkpO1xyXG4gICAgZnMud3JpdGVGaWxlU3luYyhmaWxlUGF0aCwgYnVmKTtcclxuICB9XHJcblxyXG4gIGNhbGN1bGF0ZUhhc2hGb3JGaWxlU3luYyhhYnNvbHV0ZUZpbGVQYXRoKSB7XHJcbiAgICBsZXQgYnVmID0gZnMucmVhZEZpbGVTeW5jKGFic29sdXRlRmlsZVBhdGgpO1xyXG4gICAgbGV0IGVuY29kaW5nID0gRmlsZUNoYW5nZWRDYWNoZS5kZXRlY3RGaWxlRW5jb2RpbmcoYnVmKTtcclxuXHJcbiAgICBpZiAoIWVuY29kaW5nKSB7XHJcbiAgICAgIGxldCBkaWdlc3QgPSBjcnlwdG8uY3JlYXRlSGFzaCgnc2hhMScpLnVwZGF0ZShidWYpLmRpZ2VzdCgnaGV4Jyk7XHJcbiAgICAgIHJldHVybiB7IHNvdXJjZUNvZGU6IG51bGwsIGRpZ2VzdCwgYmluYXJ5RGF0YTogYnVmfTtcclxuICAgIH1cclxuXHJcbiAgICBsZXQgc291cmNlQ29kZSA9IGZzLnJlYWRGaWxlU3luYyhhYnNvbHV0ZUZpbGVQYXRoLCBlbmNvZGluZyk7XHJcbiAgICBsZXQgZGlnZXN0ID0gY3J5cHRvLmNyZWF0ZUhhc2goJ3NoYTEnKS51cGRhdGUoc291cmNlQ29kZSwgJ3V0ZjgnKS5kaWdlc3QoJ2hleCcpO1xyXG5cclxuICAgIHJldHVybiB7c291cmNlQ29kZSwgZGlnZXN0LCBiaW5hcnlEYXRhOiBudWxsfTtcclxuICB9XHJcblxyXG5cclxuICAvKipcclxuICAgKiBEZXRlcm1pbmVzIHZpYSBzb21lIHN0YXRpc3RpY3Mgd2hldGhlciBhIGZpbGUgaXMgbGlrZWx5IHRvIGJlIG1pbmlmaWVkLlxyXG4gICAqXHJcbiAgICogQHByaXZhdGVcclxuICAgKi9cclxuICBzdGF0aWMgY29udGVudHNBcmVNaW5pZmllZChzb3VyY2UpIHtcclxuICAgIGxldCBsZW5ndGggPSBzb3VyY2UubGVuZ3RoO1xyXG4gICAgaWYgKGxlbmd0aCA+IDEwMjQpIGxlbmd0aCA9IDEwMjQ7XHJcblxyXG4gICAgbGV0IG5ld2xpbmVDb3VudCA9IDA7XHJcblxyXG4gICAgLy8gUm9sbCB0aHJvdWdoIHRoZSBjaGFyYWN0ZXJzIGFuZCBkZXRlcm1pbmUgdGhlIGF2ZXJhZ2UgbGluZSBsZW5ndGhcclxuICAgIGZvcihsZXQgaT0wOyBpIDwgc291cmNlLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGlmIChzb3VyY2VbaV0gPT09ICdcXG4nKSBuZXdsaW5lQ291bnQrKztcclxuICAgIH1cclxuXHJcbiAgICAvLyBObyBOZXdsaW5lcz8gQW55IGZpbGUgb3RoZXIgdGhhbiBhIHN1cGVyIHNtYWxsIG9uZSBpcyBtaW5pZmllZFxyXG4gICAgaWYgKG5ld2xpbmVDb3VudCA9PT0gMCkge1xyXG4gICAgICByZXR1cm4gKGxlbmd0aCA+IDgwKTtcclxuICAgIH1cclxuXHJcbiAgICBsZXQgYXZnTGluZUxlbmd0aCA9IGxlbmd0aCAvIG5ld2xpbmVDb3VudDtcclxuICAgIHJldHVybiAoYXZnTGluZUxlbmd0aCA+IDgwKTtcclxuICB9XHJcblxyXG5cclxuICAvKipcclxuICAgKiBEZXRlcm1pbmVzIHdoZXRoZXIgYSBwYXRoIGlzIGluIG5vZGVfbW9kdWxlcyBvciB0aGUgRWxlY3Ryb24gaW5pdCBjb2RlXHJcbiAgICpcclxuICAgKiBAcHJpdmF0ZVxyXG4gICAqL1xyXG4gIHN0YXRpYyBpc0luTm9kZU1vZHVsZXMoZmlsZVBhdGgpIHtcclxuICAgIHJldHVybiAhIShmaWxlUGF0aC5tYXRjaCgvKG5vZGVfbW9kdWxlc3xib3dlcl9jb21wb25lbnRzKVtcXFxcXFwvXS9pKSB8fCBmaWxlUGF0aC5tYXRjaCgvKGF0b218ZWxlY3Ryb24pXFwuYXNhci8pKTtcclxuICB9XHJcblxyXG5cclxuICAvKipcclxuICAgKiBSZXR1cm5zIHdoZXRoZXIgYSBmaWxlIGhhcyBhbiBpbmxpbmUgc291cmNlIG1hcFxyXG4gICAqXHJcbiAgICogQHByaXZhdGVcclxuICAgKi9cclxuICBzdGF0aWMgaGFzU291cmNlTWFwKHNvdXJjZUNvZGUpIHtcclxuICAgIGNvbnN0IHRyaW1tZWQgPSBzb3VyY2VDb2RlLnRyaW0oKTtcclxuICAgIHJldHVybiB0cmltbWVkLmxhc3RJbmRleE9mKCcvLyMgc291cmNlTWFwJykgPiB0cmltbWVkLmxhc3RJbmRleE9mKCdcXG4nKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIERldGVybWluZXMgdGhlIGVuY29kaW5nIG9mIGEgZmlsZSBmcm9tIHRoZSB0d28gbW9zdCBjb21tb24gZW5jb2RpbmdzIGJ5IHRyeWluZ1xyXG4gICAqIHRvIGRlY29kZSBpdCB0aGVuIGxvb2tpbmcgZm9yIGVuY29kaW5nIGVycm9yc1xyXG4gICAqXHJcbiAgICogQHByaXZhdGVcclxuICAgKi9cclxuICBzdGF0aWMgZGV0ZWN0RmlsZUVuY29kaW5nKGJ1ZmZlcikge1xyXG4gICAgaWYgKGJ1ZmZlci5sZW5ndGggPCAxKSByZXR1cm4gZmFsc2U7XHJcbiAgICBsZXQgYnVmID0gKGJ1ZmZlci5sZW5ndGggPCA0MDk2ID8gYnVmZmVyIDogYnVmZmVyLnNsaWNlKDAsIDQwOTYpKTtcclxuXHJcbiAgICBjb25zdCBlbmNvZGluZ3MgPSBbJ3V0ZjgnLCAndXRmMTZsZSddO1xyXG5cclxuICAgIGxldCBlbmNvZGluZztcclxuICAgIGlmIChidWZmZXIubGVuZ3RoIDw9IDEyOCkge1xyXG4gICAgICBlbmNvZGluZyA9IGVuY29kaW5ncy5maW5kKHggPT5cclxuICAgICAgICBCdWZmZXIuY29tcGFyZShuZXcgQnVmZmVyKGJ1ZmZlci50b1N0cmluZygpLCB4KSwgYnVmZmVyKSA9PT0gMFxyXG4gICAgICApO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgZW5jb2RpbmcgPSBlbmNvZGluZ3MuZmluZCh4ID0+ICFGaWxlQ2hhbmdlZENhY2hlLmNvbnRhaW5zQ29udHJvbENoYXJhY3RlcnMoYnVmLnRvU3RyaW5nKHgpKSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGVuY29kaW5nO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRGV0ZXJtaW5lcyB3aGV0aGVyIGEgc3RyaW5nIGlzIGxpa2VseSB0byBiZSBwb29ybHkgZW5jb2RlZCBieSBsb29raW5nIGZvclxyXG4gICAqIGNvbnRyb2wgY2hhcmFjdGVycyBhYm92ZSBhIGNlcnRhaW4gdGhyZXNob2xkXHJcbiAgICpcclxuICAgKiBAcHJpdmF0ZVxyXG4gICAqL1xyXG4gIHN0YXRpYyBjb250YWluc0NvbnRyb2xDaGFyYWN0ZXJzKHN0cikge1xyXG4gICAgbGV0IGNvbnRyb2xDb3VudCA9IDA7XHJcbiAgICBsZXQgc3BhY2VDb3VudCA9IDA7XHJcbiAgICBsZXQgdGhyZXNob2xkID0gMjtcclxuICAgIGlmIChzdHIubGVuZ3RoID4gNjQpIHRocmVzaG9sZCA9IDQ7XHJcbiAgICBpZiAoc3RyLmxlbmd0aCA+IDUxMikgdGhyZXNob2xkID0gODtcclxuXHJcbiAgICBmb3IgKGxldCBpPTA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcclxuICAgICAgbGV0IGMgPSBzdHIuY2hhckNvZGVBdChpKTtcclxuICAgICAgaWYgKGMgPT09IDY1NTM2IHx8IGMgPCA4KSBjb250cm9sQ291bnQrKztcclxuICAgICAgaWYgKGMgPiAxNCAmJiBjIDwgMzIpIGNvbnRyb2xDb3VudCsrO1xyXG4gICAgICBpZiAoYyA9PT0gMzIpIHNwYWNlQ291bnQrKztcclxuXHJcbiAgICAgIGlmIChjb250cm9sQ291bnQgPiB0aHJlc2hvbGQpIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChzcGFjZUNvdW50IDwgdGhyZXNob2xkKSByZXR1cm4gdHJ1ZTtcclxuXHJcbiAgICBpZiAoY29udHJvbENvdW50ID09PSAwKSByZXR1cm4gZmFsc2U7XHJcbiAgICByZXR1cm4gKGNvbnRyb2xDb3VudCAvIHN0ci5sZW5ndGgpIDwgMC4wMjtcclxuICB9XHJcbn1cclxuIl19