'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.rigHtmlDocumentToInitializeElectronCompile = rigHtmlDocumentToInitializeElectronCompile;
exports.addBypassChecker = addBypassChecker;
exports.initializeProtocolHook = initializeProtocolHook;

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _mimeTypes = require('@paulcbetts/mime-types');

var _mimeTypes2 = _interopRequireDefault(_mimeTypes);

var _lruCache = require('lru-cache');

var _lruCache2 = _interopRequireDefault(_lruCache);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const magicWords = "__magic__file__to__help__electron__compile.js";

// NB: These are duped in initialize-renderer so we can save startup time, make
// sure to run both!
const magicGlobalForRootCacheDir = '__electron_compile_root_cache_dir';
const magicGlobalForAppRootDir = '__electron_compile_app_root_dir';

const d = require('debug')('electron-compile:protocol-hook');

let protocol = null;

const mapStatCache = new _lruCache2.default({ length: 512 });
function doesMapFileExist(filePath) {
  let ret = mapStatCache.get(filePath);
  if (ret !== undefined) return Promise.resolve(ret);

  return new Promise(res => {
    _fs2.default.lstat(filePath, (err, s) => {
      let failed = err || !s;

      mapStatCache.set(filePath, !failed);
      res(!failed);
    });
  });
}

/**
 * Adds our script header to the top of all HTML files
 *
 * @private
 */
function rigHtmlDocumentToInitializeElectronCompile(doc) {
  let lines = doc.split("\n");
  let replacement = `<head><script src="${magicWords}"></script>`;
  let replacedHead = false;

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].match(/<head>/i)) continue;

    lines[i] = lines[i].replace(/<head>/i, replacement);
    replacedHead = true;
    break;
  }

  if (!replacedHead) {
    replacement = `<html$1><head><script src="${magicWords}"></script></head>`;
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].match(/<html/i)) continue;

      lines[i] = lines[i].replace(/<html([^>]+)>/i, replacement);
      break;
    }
  }

  return lines.join("\n");
}

function requestFileJob(filePath, finish) {
  _fs2.default.readFile(filePath, (err, buf) => {
    if (err) {
      if (err.errno === 34) {
        finish(-6); // net::ERR_FILE_NOT_FOUND
        return;
      } else {
        finish(-2); // net::FAILED
        return;
      }
    }

    finish({
      data: buf,
      mimeType: _mimeTypes2.default.lookup(filePath) || 'text/plain'
    });
  });
}

const bypassCheckers = [];

/**
 * Adds a function that will be called on electron-compile's protocol hook
 * used to intercept file requests.  Use this to bypass electron-compile
 * entirely for certain URI's.
 * 
 * @param {Function} bypassChecker Function that will be called with the file path to determine whether to bypass or not
 */
function addBypassChecker(bypassChecker) {
  bypassCheckers.push(bypassChecker);
}

/**
 * Initializes the protocol hook on file: that allows us to intercept files
 * loaded by Chromium and rewrite them. This method along with
 * {@link registerRequireExtension} are the top-level methods that electron-compile
 * actually uses to intercept code that Electron loads.
 *
 * @param  {CompilerHost} compilerHost  The compiler host to use for compilation.
 */
function initializeProtocolHook(compilerHost) {
  protocol = protocol || require('electron').protocol;

  global[magicGlobalForRootCacheDir] = compilerHost.rootCacheDir;
  global[magicGlobalForAppRootDir] = compilerHost.appRoot;

  const electronCompileSetupCode = `if (window.require) require('electron-compile/lib/initialize-renderer').initializeRendererProcess(${compilerHost.readOnlyMode});`;

  protocol.interceptBufferProtocol('file', (() => {
    var _ref = _asyncToGenerator(function* (request, finish) {
      let uri = _url2.default.parse(request.url);

      d(`Intercepting url ${request.url}`);
      if (request.url.indexOf(magicWords) > -1) {
        finish({
          mimeType: 'application/javascript',
          data: new Buffer(electronCompileSetupCode, 'utf8')
        });

        return;
      }

      // This is a protocol-relative URL that has gone pear-shaped in Electron,
      // let's rewrite it
      if (uri.host && uri.host.length > 1) {
        //let newUri = request.url.replace(/^file:/, "https:");
        // TODO: Jump off this bridge later
        d(`TODO: Found bogus protocol-relative URL, can't fix it up!!`);
        finish(-2);
        return;
      }

      let filePath = decodeURIComponent(uri.pathname);

      // NB: pathname has a leading '/' on Win32 for some reason
      if (process.platform === 'win32') {
        filePath = filePath.slice(1);
      }

      // NB: Special-case files coming from atom.asar or node_modules
      if (filePath.match(/[\/\\](atom|electron).asar/) || filePath.match(/[\/\\](node_modules|bower_components)/)) {
        // NBs on NBs: If we're loading an HTML file from node_modules, we still have
        // to do the HTML document rigging
        if (filePath.match(/\.html?$/i)) {
          let riggedContents = null;
          _fs2.default.readFile(filePath, 'utf8', function (err, contents) {
            if (err) {
              if (err.errno === 34) {
                finish(-6); // net::ERR_FILE_NOT_FOUND
                return;
              } else {
                finish(-2); // net::FAILED
                return;
              }
            }

            riggedContents = rigHtmlDocumentToInitializeElectronCompile(contents);
            finish({ data: new Buffer(riggedContents), mimeType: 'text/html' });
            return;
          });

          return;
        }

        requestFileJob(filePath, finish);
        return;
      }

      // NB: Chromium will somehow decide that external source map references
      // aren't relative to the file that was loaded for node.js modules, but
      // relative to the HTML file. Since we can't really figure out what the
      // real path is, we just need to squelch it.
      if (filePath.match(/\.map$/i) && !(yield doesMapFileExist(filePath))) {
        finish({ data: new Buffer("", 'utf8'), mimeType: 'text/plain' });
        return;
      }

      for (const bypassChecker of bypassCheckers) {
        if (bypassChecker(filePath)) {
          d('bypassing compilers for:', filePath);
          requestFileJob(filePath, finish);
          return;
        }
      }

      try {
        let result = yield compilerHost.compile(filePath);

        if (result.mimeType === 'text/html') {
          result.code = rigHtmlDocumentToInitializeElectronCompile(result.code);
        }

        if (result.binaryData || result.code instanceof Buffer) {
          finish({ data: result.binaryData || result.code, mimeType: result.mimeType });
          return;
        } else {
          finish({ data: new Buffer(result.code), mimeType: result.mimeType });
          return;
        }
      } catch (e) {
        let err = `Failed to compile ${filePath}: ${e.message}\n${e.stack}`;
        d(err);

        if (e.errno === 34 /*ENOENT*/) {
            finish(-6); // net::ERR_FILE_NOT_FOUND
            return;
          }

        finish({ mimeType: 'text/plain', data: new Buffer(err) });
        return;
      }
    });

    return function (_x, _x2) {
      return _ref.apply(this, arguments);
    };
  })());
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9wcm90b2NvbC1ob29rLmpzIl0sIm5hbWVzIjpbInJpZ0h0bWxEb2N1bWVudFRvSW5pdGlhbGl6ZUVsZWN0cm9uQ29tcGlsZSIsImFkZEJ5cGFzc0NoZWNrZXIiLCJpbml0aWFsaXplUHJvdG9jb2xIb29rIiwibWFnaWNXb3JkcyIsIm1hZ2ljR2xvYmFsRm9yUm9vdENhY2hlRGlyIiwibWFnaWNHbG9iYWxGb3JBcHBSb290RGlyIiwiZCIsInJlcXVpcmUiLCJwcm90b2NvbCIsIm1hcFN0YXRDYWNoZSIsImxlbmd0aCIsImRvZXNNYXBGaWxlRXhpc3QiLCJmaWxlUGF0aCIsInJldCIsImdldCIsInVuZGVmaW5lZCIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVzIiwibHN0YXQiLCJlcnIiLCJzIiwiZmFpbGVkIiwic2V0IiwiZG9jIiwibGluZXMiLCJzcGxpdCIsInJlcGxhY2VtZW50IiwicmVwbGFjZWRIZWFkIiwiaSIsIm1hdGNoIiwicmVwbGFjZSIsImpvaW4iLCJyZXF1ZXN0RmlsZUpvYiIsImZpbmlzaCIsInJlYWRGaWxlIiwiYnVmIiwiZXJybm8iLCJkYXRhIiwibWltZVR5cGUiLCJsb29rdXAiLCJieXBhc3NDaGVja2VycyIsImJ5cGFzc0NoZWNrZXIiLCJwdXNoIiwiY29tcGlsZXJIb3N0IiwiZ2xvYmFsIiwicm9vdENhY2hlRGlyIiwiYXBwUm9vdCIsImVsZWN0cm9uQ29tcGlsZVNldHVwQ29kZSIsInJlYWRPbmx5TW9kZSIsImludGVyY2VwdEJ1ZmZlclByb3RvY29sIiwicmVxdWVzdCIsInVyaSIsInBhcnNlIiwidXJsIiwiaW5kZXhPZiIsIkJ1ZmZlciIsImhvc3QiLCJkZWNvZGVVUklDb21wb25lbnQiLCJwYXRobmFtZSIsInByb2Nlc3MiLCJwbGF0Zm9ybSIsInNsaWNlIiwicmlnZ2VkQ29udGVudHMiLCJjb250ZW50cyIsInJlc3VsdCIsImNvbXBpbGUiLCJjb2RlIiwiYmluYXJ5RGF0YSIsImUiLCJtZXNzYWdlIiwic3RhY2si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anMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgdXJsIGZyb20gJ3VybCc7XHJcbmltcG9ydCBmcyBmcm9tICdmcyc7XHJcbmltcG9ydCBtaW1lIGZyb20gJ0BwYXVsY2JldHRzL21pbWUtdHlwZXMnO1xyXG5pbXBvcnQgTFJVIGZyb20gJ2xydS1jYWNoZSc7XHJcblxyXG5jb25zdCBtYWdpY1dvcmRzID0gXCJfX21hZ2ljX19maWxlX190b19faGVscF9fZWxlY3Ryb25fX2NvbXBpbGUuanNcIjtcclxuXHJcbi8vIE5COiBUaGVzZSBhcmUgZHVwZWQgaW4gaW5pdGlhbGl6ZS1yZW5kZXJlciBzbyB3ZSBjYW4gc2F2ZSBzdGFydHVwIHRpbWUsIG1ha2VcclxuLy8gc3VyZSB0byBydW4gYm90aCFcclxuY29uc3QgbWFnaWNHbG9iYWxGb3JSb290Q2FjaGVEaXIgPSAnX19lbGVjdHJvbl9jb21waWxlX3Jvb3RfY2FjaGVfZGlyJztcclxuY29uc3QgbWFnaWNHbG9iYWxGb3JBcHBSb290RGlyID0gJ19fZWxlY3Ryb25fY29tcGlsZV9hcHBfcm9vdF9kaXInO1xyXG5cclxuY29uc3QgZCA9IHJlcXVpcmUoJ2RlYnVnJykoJ2VsZWN0cm9uLWNvbXBpbGU6cHJvdG9jb2wtaG9vaycpO1xyXG5cclxubGV0IHByb3RvY29sID0gbnVsbDtcclxuXHJcbmNvbnN0IG1hcFN0YXRDYWNoZSA9IG5ldyBMUlUoe2xlbmd0aDogNTEyfSk7XHJcbmZ1bmN0aW9uIGRvZXNNYXBGaWxlRXhpc3QoZmlsZVBhdGgpIHtcclxuICBsZXQgcmV0ID0gbWFwU3RhdENhY2hlLmdldChmaWxlUGF0aCk7XHJcbiAgaWYgKHJldCAhPT0gdW5kZWZpbmVkKSByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHJldCk7XHJcblxyXG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzKSA9PiB7XHJcbiAgICBmcy5sc3RhdChmaWxlUGF0aCwgKGVyciwgcykgPT4ge1xyXG4gICAgICBsZXQgZmFpbGVkID0gKGVyciB8fCAhcyk7XHJcblxyXG4gICAgICBtYXBTdGF0Q2FjaGUuc2V0KGZpbGVQYXRoLCAhZmFpbGVkKTtcclxuICAgICAgcmVzKCFmYWlsZWQpO1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBBZGRzIG91ciBzY3JpcHQgaGVhZGVyIHRvIHRoZSB0b3Agb2YgYWxsIEhUTUwgZmlsZXNcclxuICpcclxuICogQHByaXZhdGVcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiByaWdIdG1sRG9jdW1lbnRUb0luaXRpYWxpemVFbGVjdHJvbkNvbXBpbGUoZG9jKSB7XHJcbiAgbGV0IGxpbmVzID0gZG9jLnNwbGl0KFwiXFxuXCIpO1xyXG4gIGxldCByZXBsYWNlbWVudCA9IGA8aGVhZD48c2NyaXB0IHNyYz1cIiR7bWFnaWNXb3Jkc31cIj48L3NjcmlwdD5gO1xyXG4gIGxldCByZXBsYWNlZEhlYWQgPSBmYWxzZTtcclxuXHJcbiAgZm9yIChsZXQgaT0wOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcclxuICAgIGlmICghbGluZXNbaV0ubWF0Y2goLzxoZWFkPi9pKSkgY29udGludWU7XHJcblxyXG4gICAgbGluZXNbaV0gPSAobGluZXNbaV0pLnJlcGxhY2UoLzxoZWFkPi9pLCByZXBsYWNlbWVudCk7XHJcbiAgICByZXBsYWNlZEhlYWQgPSB0cnVlO1xyXG4gICAgYnJlYWs7XHJcbiAgfVxyXG5cclxuICBpZiAoIXJlcGxhY2VkSGVhZCkge1xyXG4gICAgcmVwbGFjZW1lbnQgPSBgPGh0bWwkMT48aGVhZD48c2NyaXB0IHNyYz1cIiR7bWFnaWNXb3Jkc31cIj48L3NjcmlwdD48L2hlYWQ+YDtcclxuICAgIGZvciAobGV0IGk9MDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGlmICghbGluZXNbaV0ubWF0Y2goLzxodG1sL2kpKSBjb250aW51ZTtcclxuXHJcbiAgICAgIGxpbmVzW2ldID0gKGxpbmVzW2ldKS5yZXBsYWNlKC88aHRtbChbXj5dKyk+L2ksIHJlcGxhY2VtZW50KTtcclxuICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gbGluZXMuam9pbihcIlxcblwiKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcmVxdWVzdEZpbGVKb2IoZmlsZVBhdGgsIGZpbmlzaCkge1xyXG4gIGZzLnJlYWRGaWxlKGZpbGVQYXRoLCAoZXJyLCBidWYpID0+IHtcclxuICAgIGlmIChlcnIpIHtcclxuICAgICAgaWYgKGVyci5lcnJubyA9PT0gMzQpIHtcclxuICAgICAgICBmaW5pc2goLTYpOyAvLyBuZXQ6OkVSUl9GSUxFX05PVF9GT1VORFxyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBmaW5pc2goLTIpOyAvLyBuZXQ6OkZBSUxFRFxyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZpbmlzaCh7XHJcbiAgICAgIGRhdGE6IGJ1ZixcclxuICAgICAgbWltZVR5cGU6IG1pbWUubG9va3VwKGZpbGVQYXRoKSB8fCAndGV4dC9wbGFpbidcclxuICAgIH0pO1xyXG4gIH0pO1xyXG59XHJcblxyXG5jb25zdCBieXBhc3NDaGVja2VycyA9IFtdO1xyXG5cclxuLyoqXHJcbiAqIEFkZHMgYSBmdW5jdGlvbiB0aGF0IHdpbGwgYmUgY2FsbGVkIG9uIGVsZWN0cm9uLWNvbXBpbGUncyBwcm90b2NvbCBob29rXHJcbiAqIHVzZWQgdG8gaW50ZXJjZXB0IGZpbGUgcmVxdWVzdHMuICBVc2UgdGhpcyB0byBieXBhc3MgZWxlY3Ryb24tY29tcGlsZVxyXG4gKiBlbnRpcmVseSBmb3IgY2VydGFpbiBVUkkncy5cclxuICogXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGJ5cGFzc0NoZWNrZXIgRnVuY3Rpb24gdGhhdCB3aWxsIGJlIGNhbGxlZCB3aXRoIHRoZSBmaWxlIHBhdGggdG8gZGV0ZXJtaW5lIHdoZXRoZXIgdG8gYnlwYXNzIG9yIG5vdFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGFkZEJ5cGFzc0NoZWNrZXIoYnlwYXNzQ2hlY2tlcikge1xyXG4gIGJ5cGFzc0NoZWNrZXJzLnB1c2goYnlwYXNzQ2hlY2tlcik7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBJbml0aWFsaXplcyB0aGUgcHJvdG9jb2wgaG9vayBvbiBmaWxlOiB0aGF0IGFsbG93cyB1cyB0byBpbnRlcmNlcHQgZmlsZXNcclxuICogbG9hZGVkIGJ5IENocm9taXVtIGFuZCByZXdyaXRlIHRoZW0uIFRoaXMgbWV0aG9kIGFsb25nIHdpdGhcclxuICoge0BsaW5rIHJlZ2lzdGVyUmVxdWlyZUV4dGVuc2lvbn0gYXJlIHRoZSB0b3AtbGV2ZWwgbWV0aG9kcyB0aGF0IGVsZWN0cm9uLWNvbXBpbGVcclxuICogYWN0dWFsbHkgdXNlcyB0byBpbnRlcmNlcHQgY29kZSB0aGF0IEVsZWN0cm9uIGxvYWRzLlxyXG4gKlxyXG4gKiBAcGFyYW0gIHtDb21waWxlckhvc3R9IGNvbXBpbGVySG9zdCAgVGhlIGNvbXBpbGVyIGhvc3QgdG8gdXNlIGZvciBjb21waWxhdGlvbi5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBpbml0aWFsaXplUHJvdG9jb2xIb29rKGNvbXBpbGVySG9zdCkge1xyXG4gIHByb3RvY29sID0gcHJvdG9jb2wgfHwgcmVxdWlyZSgnZWxlY3Ryb24nKS5wcm90b2NvbDtcclxuXHJcbiAgZ2xvYmFsW21hZ2ljR2xvYmFsRm9yUm9vdENhY2hlRGlyXSA9IGNvbXBpbGVySG9zdC5yb290Q2FjaGVEaXI7XHJcbiAgZ2xvYmFsW21hZ2ljR2xvYmFsRm9yQXBwUm9vdERpcl0gPSBjb21waWxlckhvc3QuYXBwUm9vdDtcclxuXHJcbiAgY29uc3QgZWxlY3Ryb25Db21waWxlU2V0dXBDb2RlID0gYGlmICh3aW5kb3cucmVxdWlyZSkgcmVxdWlyZSgnZWxlY3Ryb24tY29tcGlsZS9saWIvaW5pdGlhbGl6ZS1yZW5kZXJlcicpLmluaXRpYWxpemVSZW5kZXJlclByb2Nlc3MoJHtjb21waWxlckhvc3QucmVhZE9ubHlNb2RlfSk7YDtcclxuXHJcbiAgcHJvdG9jb2wuaW50ZXJjZXB0QnVmZmVyUHJvdG9jb2woJ2ZpbGUnLCBhc3luYyBmdW5jdGlvbihyZXF1ZXN0LCBmaW5pc2gpIHtcclxuICAgIGxldCB1cmkgPSB1cmwucGFyc2UocmVxdWVzdC51cmwpO1xyXG5cclxuICAgIGQoYEludGVyY2VwdGluZyB1cmwgJHtyZXF1ZXN0LnVybH1gKTtcclxuICAgIGlmIChyZXF1ZXN0LnVybC5pbmRleE9mKG1hZ2ljV29yZHMpID4gLTEpIHtcclxuICAgICAgZmluaXNoKHtcclxuICAgICAgICBtaW1lVHlwZTogJ2FwcGxpY2F0aW9uL2phdmFzY3JpcHQnLFxyXG4gICAgICAgIGRhdGE6IG5ldyBCdWZmZXIoZWxlY3Ryb25Db21waWxlU2V0dXBDb2RlLCAndXRmOCcpXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFRoaXMgaXMgYSBwcm90b2NvbC1yZWxhdGl2ZSBVUkwgdGhhdCBoYXMgZ29uZSBwZWFyLXNoYXBlZCBpbiBFbGVjdHJvbixcclxuICAgIC8vIGxldCdzIHJld3JpdGUgaXRcclxuICAgIGlmICh1cmkuaG9zdCAmJiB1cmkuaG9zdC5sZW5ndGggPiAxKSB7XHJcbiAgICAgIC8vbGV0IG5ld1VyaSA9IHJlcXVlc3QudXJsLnJlcGxhY2UoL15maWxlOi8sIFwiaHR0cHM6XCIpO1xyXG4gICAgICAvLyBUT0RPOiBKdW1wIG9mZiB0aGlzIGJyaWRnZSBsYXRlclxyXG4gICAgICBkKGBUT0RPOiBGb3VuZCBib2d1cyBwcm90b2NvbC1yZWxhdGl2ZSBVUkwsIGNhbid0IGZpeCBpdCB1cCEhYCk7XHJcbiAgICAgIGZpbmlzaCgtMik7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBsZXQgZmlsZVBhdGggPSBkZWNvZGVVUklDb21wb25lbnQodXJpLnBhdGhuYW1lKTtcclxuXHJcbiAgICAvLyBOQjogcGF0aG5hbWUgaGFzIGEgbGVhZGluZyAnLycgb24gV2luMzIgZm9yIHNvbWUgcmVhc29uXHJcbiAgICBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJykge1xyXG4gICAgICBmaWxlUGF0aCA9IGZpbGVQYXRoLnNsaWNlKDEpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIE5COiBTcGVjaWFsLWNhc2UgZmlsZXMgY29taW5nIGZyb20gYXRvbS5hc2FyIG9yIG5vZGVfbW9kdWxlc1xyXG4gICAgaWYgKGZpbGVQYXRoLm1hdGNoKC9bXFwvXFxcXF0oYXRvbXxlbGVjdHJvbikuYXNhci8pIHx8IGZpbGVQYXRoLm1hdGNoKC9bXFwvXFxcXF0obm9kZV9tb2R1bGVzfGJvd2VyX2NvbXBvbmVudHMpLykpIHtcclxuICAgICAgLy8gTkJzIG9uIE5CczogSWYgd2UncmUgbG9hZGluZyBhbiBIVE1MIGZpbGUgZnJvbSBub2RlX21vZHVsZXMsIHdlIHN0aWxsIGhhdmVcclxuICAgICAgLy8gdG8gZG8gdGhlIEhUTUwgZG9jdW1lbnQgcmlnZ2luZ1xyXG4gICAgICBpZiAoZmlsZVBhdGgubWF0Y2goL1xcLmh0bWw/JC9pKSkge1xyXG4gICAgICAgIGxldCByaWdnZWRDb250ZW50cyA9IG51bGw7XHJcbiAgICAgICAgZnMucmVhZEZpbGUoZmlsZVBhdGgsICd1dGY4JywgKGVyciwgY29udGVudHMpID0+IHtcclxuICAgICAgICAgIGlmIChlcnIpIHtcclxuICAgICAgICAgICAgaWYgKGVyci5lcnJubyA9PT0gMzQpIHtcclxuICAgICAgICAgICAgICBmaW5pc2goLTYpOyAvLyBuZXQ6OkVSUl9GSUxFX05PVF9GT1VORFxyXG4gICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICBmaW5pc2goLTIpOyAvLyBuZXQ6OkZBSUxFRFxyXG4gICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIHJpZ2dlZENvbnRlbnRzID0gcmlnSHRtbERvY3VtZW50VG9Jbml0aWFsaXplRWxlY3Ryb25Db21waWxlKGNvbnRlbnRzKTtcclxuICAgICAgICAgIGZpbmlzaCh7IGRhdGE6IG5ldyBCdWZmZXIocmlnZ2VkQ29udGVudHMpLCBtaW1lVHlwZTogJ3RleHQvaHRtbCcgfSk7XHJcbiAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgcmVxdWVzdEZpbGVKb2IoZmlsZVBhdGgsIGZpbmlzaCk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICAvLyBOQjogQ2hyb21pdW0gd2lsbCBzb21laG93IGRlY2lkZSB0aGF0IGV4dGVybmFsIHNvdXJjZSBtYXAgcmVmZXJlbmNlc1xyXG4gICAgLy8gYXJlbid0IHJlbGF0aXZlIHRvIHRoZSBmaWxlIHRoYXQgd2FzIGxvYWRlZCBmb3Igbm9kZS5qcyBtb2R1bGVzLCBidXRcclxuICAgIC8vIHJlbGF0aXZlIHRvIHRoZSBIVE1MIGZpbGUuIFNpbmNlIHdlIGNhbid0IHJlYWxseSBmaWd1cmUgb3V0IHdoYXQgdGhlXHJcbiAgICAvLyByZWFsIHBhdGggaXMsIHdlIGp1c3QgbmVlZCB0byBzcXVlbGNoIGl0LlxyXG4gICAgaWYgKGZpbGVQYXRoLm1hdGNoKC9cXC5tYXAkL2kpICYmICEoYXdhaXQgZG9lc01hcEZpbGVFeGlzdChmaWxlUGF0aCkpKSB7XHJcbiAgICAgIGZpbmlzaCh7IGRhdGE6IG5ldyBCdWZmZXIoXCJcIiwgJ3V0ZjgnKSwgbWltZVR5cGU6ICd0ZXh0L3BsYWluJyB9KTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGZvciAoY29uc3QgYnlwYXNzQ2hlY2tlciBvZiBieXBhc3NDaGVja2Vycykge1xyXG4gICAgICBpZiAoYnlwYXNzQ2hlY2tlcihmaWxlUGF0aCkpIHtcclxuICAgICAgICBkKCdieXBhc3NpbmcgY29tcGlsZXJzIGZvcjonLCBmaWxlUGF0aCk7XHJcbiAgICAgICAgcmVxdWVzdEZpbGVKb2IoZmlsZVBhdGgsIGZpbmlzaCk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgbGV0IHJlc3VsdCA9IGF3YWl0IGNvbXBpbGVySG9zdC5jb21waWxlKGZpbGVQYXRoKTtcclxuXHJcbiAgICAgIGlmIChyZXN1bHQubWltZVR5cGUgPT09ICd0ZXh0L2h0bWwnKSB7XHJcbiAgICAgICAgcmVzdWx0LmNvZGUgPSByaWdIdG1sRG9jdW1lbnRUb0luaXRpYWxpemVFbGVjdHJvbkNvbXBpbGUocmVzdWx0LmNvZGUpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAocmVzdWx0LmJpbmFyeURhdGEgfHwgcmVzdWx0LmNvZGUgaW5zdGFuY2VvZiBCdWZmZXIpIHtcclxuICAgICAgICBmaW5pc2goeyBkYXRhOiByZXN1bHQuYmluYXJ5RGF0YSB8fCByZXN1bHQuY29kZSwgbWltZVR5cGU6IHJlc3VsdC5taW1lVHlwZSB9KTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgZmluaXNoKHsgZGF0YTogbmV3IEJ1ZmZlcihyZXN1bHQuY29kZSksIG1pbWVUeXBlOiByZXN1bHQubWltZVR5cGUgfSk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcbiAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgIGxldCBlcnIgPSBgRmFpbGVkIHRvIGNvbXBpbGUgJHtmaWxlUGF0aH06ICR7ZS5tZXNzYWdlfVxcbiR7ZS5zdGFja31gO1xyXG4gICAgICBkKGVycik7XHJcblxyXG4gICAgICBpZiAoZS5lcnJubyA9PT0gMzQgLypFTk9FTlQqLykge1xyXG4gICAgICAgIGZpbmlzaCgtNik7IC8vIG5ldDo6RVJSX0ZJTEVfTk9UX0ZPVU5EXHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBmaW5pc2goeyBtaW1lVHlwZTogJ3RleHQvcGxhaW4nLCBkYXRhOiBuZXcgQnVmZmVyKGVycikgfSk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICB9KTtcclxufVxyXG4iXX0=