'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = sanitizeFilePath;

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _lruCache = require('lru-cache');

var _lruCache2 = _interopRequireDefault(_lruCache);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const d = require('debug')('electron-compile:sanitize-paths');
const realpathCache = (0, _lruCache2.default)({ max: 1024 });

function cachedRealpath(p) {
  let ret = realpathCache.get(p);
  if (ret) return ret;

  ret = _fs2.default.realpathSync(p);
  d(`Cache miss for cachedRealpath: '${p}' => '${ret}'`);

  realpathCache.set(p, ret);
  return ret;
}

/**
 * Electron will sometimes hand us paths that don't match the platform if they
 * were derived from a URL (i.e. 'C:/Users/Paul/...'), whereas the cache will have
 * saved paths with backslashes.
 *
 * @private
 */
function sanitizeFilePath(file) {
  if (!file) return file;

  // NB: Some people add symlinks into system directories. node.js will internally
  // call realpath on paths that it finds, which will break our cache resolution.
  // We need to catch this scenario and fix it up. The tricky part is, some parts
  // of Electron will give us the pre-resolved paths, and others will give us the
  // post-resolved one. We need to handle both.

  let realFile = null;
  let parts = file.split(/[\\\/]app.asar[\\\/]/);
  if (!parts[1]) {
    // Not using an ASAR archive
    realFile = cachedRealpath(file);
  } else {
    // We do all this silliness to work around
    // https://github.com/atom/electron/issues/4610
    realFile = `${cachedRealpath(parts[0])}/app.asar/${parts[1]}`;
  }

  return realFile.replace(/[\\\/]/g, '/');
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9zYW5pdGl6ZS1wYXRocy5qcyJdLCJuYW1lcyI6WyJzYW5pdGl6ZUZpbGVQYXRoIiwiZCIsInJlcXVpcmUiLCJyZWFscGF0aENhY2hlIiwibWF4IiwiY2FjaGVkUmVhbHBhdGgiLCJwIiwicmV0IiwiZ2V0IiwicmVhbHBhdGhTeW5jIiwic2V0IiwiZmlsZSIsInJlYWxGaWxlIiwicGFydHMiLCJzcGxpdCIsInJlcGxhY2UiXSwibWFwcGluZ3MiOiI7Ozs7O2tCQXdCd0JBLGdCOztBQXhCeEI7Ozs7QUFDQTs7Ozs7O0FBRUEsTUFBTUMsSUFBSUMsUUFBUSxPQUFSLEVBQWlCLGlDQUFqQixDQUFWO0FBQ0EsTUFBTUMsZ0JBQWdCLHdCQUFTLEVBQUVDLEtBQUssSUFBUCxFQUFULENBQXRCOztBQUVBLFNBQVNDLGNBQVQsQ0FBd0JDLENBQXhCLEVBQTJCO0FBQ3pCLE1BQUlDLE1BQU1KLGNBQWNLLEdBQWQsQ0FBa0JGLENBQWxCLENBQVY7QUFDQSxNQUFJQyxHQUFKLEVBQVMsT0FBT0EsR0FBUDs7QUFFVEEsUUFBTSxhQUFHRSxZQUFILENBQWdCSCxDQUFoQixDQUFOO0FBQ0FMLElBQUcsbUNBQWtDSyxDQUFFLFNBQVFDLEdBQUksR0FBbkQ7O0FBRUFKLGdCQUFjTyxHQUFkLENBQWtCSixDQUFsQixFQUFxQkMsR0FBckI7QUFDQSxTQUFPQSxHQUFQO0FBQ0Q7O0FBRUQ7Ozs7Ozs7QUFPZSxTQUFTUCxnQkFBVCxDQUEwQlcsSUFBMUIsRUFBZ0M7QUFDN0MsTUFBSSxDQUFDQSxJQUFMLEVBQVcsT0FBT0EsSUFBUDs7QUFFWDtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBLE1BQUlDLFdBQVcsSUFBZjtBQUNBLE1BQUlDLFFBQVFGLEtBQUtHLEtBQUwsQ0FBVyxzQkFBWCxDQUFaO0FBQ0EsTUFBSSxDQUFDRCxNQUFNLENBQU4sQ0FBTCxFQUFlO0FBQ2I7QUFDQUQsZUFBV1AsZUFBZU0sSUFBZixDQUFYO0FBQ0QsR0FIRCxNQUdPO0FBQ0w7QUFDQTtBQUNBQyxlQUFZLEdBQUVQLGVBQWVRLE1BQU0sQ0FBTixDQUFmLENBQXlCLGFBQVlBLE1BQU0sQ0FBTixDQUFTLEVBQTVEO0FBQ0Q7O0FBRUQsU0FBT0QsU0FBU0csT0FBVCxDQUFpQixTQUFqQixFQUE0QixHQUE1QixDQUFQO0FBQ0QiLCJmaWxlIjoic2FuaXRpemUtcGF0aHMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZnMgZnJvbSAnZnMnO1xyXG5pbXBvcnQgTFJVQ2FjaGUgZnJvbSAnbHJ1LWNhY2hlJztcclxuXHJcbmNvbnN0IGQgPSByZXF1aXJlKCdkZWJ1ZycpKCdlbGVjdHJvbi1jb21waWxlOnNhbml0aXplLXBhdGhzJyk7XHJcbmNvbnN0IHJlYWxwYXRoQ2FjaGUgPSBMUlVDYWNoZSh7IG1heDogMTAyNCB9KTtcclxuXHJcbmZ1bmN0aW9uIGNhY2hlZFJlYWxwYXRoKHApIHtcclxuICBsZXQgcmV0ID0gcmVhbHBhdGhDYWNoZS5nZXQocCk7XHJcbiAgaWYgKHJldCkgcmV0dXJuIHJldDtcclxuXHJcbiAgcmV0ID0gZnMucmVhbHBhdGhTeW5jKHApO1xyXG4gIGQoYENhY2hlIG1pc3MgZm9yIGNhY2hlZFJlYWxwYXRoOiAnJHtwfScgPT4gJyR7cmV0fSdgKTtcclxuXHJcbiAgcmVhbHBhdGhDYWNoZS5zZXQocCwgcmV0KTtcclxuICByZXR1cm4gcmV0O1xyXG59XHJcblxyXG4vKipcclxuICogRWxlY3Ryb24gd2lsbCBzb21ldGltZXMgaGFuZCB1cyBwYXRocyB0aGF0IGRvbid0IG1hdGNoIHRoZSBwbGF0Zm9ybSBpZiB0aGV5XHJcbiAqIHdlcmUgZGVyaXZlZCBmcm9tIGEgVVJMIChpLmUuICdDOi9Vc2Vycy9QYXVsLy4uLicpLCB3aGVyZWFzIHRoZSBjYWNoZSB3aWxsIGhhdmVcclxuICogc2F2ZWQgcGF0aHMgd2l0aCBiYWNrc2xhc2hlcy5cclxuICpcclxuICogQHByaXZhdGVcclxuICovXHJcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHNhbml0aXplRmlsZVBhdGgoZmlsZSkge1xyXG4gIGlmICghZmlsZSkgcmV0dXJuIGZpbGU7XHJcblxyXG4gIC8vIE5COiBTb21lIHBlb3BsZSBhZGQgc3ltbGlua3MgaW50byBzeXN0ZW0gZGlyZWN0b3JpZXMuIG5vZGUuanMgd2lsbCBpbnRlcm5hbGx5XHJcbiAgLy8gY2FsbCByZWFscGF0aCBvbiBwYXRocyB0aGF0IGl0IGZpbmRzLCB3aGljaCB3aWxsIGJyZWFrIG91ciBjYWNoZSByZXNvbHV0aW9uLlxyXG4gIC8vIFdlIG5lZWQgdG8gY2F0Y2ggdGhpcyBzY2VuYXJpbyBhbmQgZml4IGl0IHVwLiBUaGUgdHJpY2t5IHBhcnQgaXMsIHNvbWUgcGFydHNcclxuICAvLyBvZiBFbGVjdHJvbiB3aWxsIGdpdmUgdXMgdGhlIHByZS1yZXNvbHZlZCBwYXRocywgYW5kIG90aGVycyB3aWxsIGdpdmUgdXMgdGhlXHJcbiAgLy8gcG9zdC1yZXNvbHZlZCBvbmUuIFdlIG5lZWQgdG8gaGFuZGxlIGJvdGguXHJcblxyXG4gIGxldCByZWFsRmlsZSA9IG51bGw7XHJcbiAgbGV0IHBhcnRzID0gZmlsZS5zcGxpdCgvW1xcXFxcXC9dYXBwLmFzYXJbXFxcXFxcL10vKTtcclxuICBpZiAoIXBhcnRzWzFdKSB7XHJcbiAgICAvLyBOb3QgdXNpbmcgYW4gQVNBUiBhcmNoaXZlXHJcbiAgICByZWFsRmlsZSA9IGNhY2hlZFJlYWxwYXRoKGZpbGUpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICAvLyBXZSBkbyBhbGwgdGhpcyBzaWxsaW5lc3MgdG8gd29yayBhcm91bmRcclxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9hdG9tL2VsZWN0cm9uL2lzc3Vlcy80NjEwXHJcbiAgICByZWFsRmlsZSA9IGAke2NhY2hlZFJlYWxwYXRoKHBhcnRzWzBdKX0vYXBwLmFzYXIvJHtwYXJ0c1sxXX1gO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHJlYWxGaWxlLnJlcGxhY2UoL1tcXFxcXFwvXS9nLCAnLycpO1xyXG59XHJcbiJdfQ==