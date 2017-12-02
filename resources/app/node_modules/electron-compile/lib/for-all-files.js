'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.forAllFiles = forAllFiles;
exports.forAllFilesSync = forAllFilesSync;

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _promise = require('./promise');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

/**
 * Invokes a method on all files in a directory recursively.
 * 
 * @private
 */
function forAllFiles(rootDirectory, func) {
  for (var _len = arguments.length, args = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
    args[_key - 2] = arguments[_key];
  }

  let rec = (() => {
    var _ref = _asyncToGenerator(function* (dir) {
      let entries = yield _promise.pfs.readdir(dir);

      for (let name of entries) {
        let fullName = _path2.default.join(dir, name);
        let stats = yield _promise.pfs.stat(fullName);

        if (stats.isDirectory()) {
          yield rec(fullName);
        }

        if (stats.isFile()) {
          yield func(fullName, ...args);
        }
      }
    });

    return function rec(_x) {
      return _ref.apply(this, arguments);
    };
  })();

  return rec(rootDirectory);
}

function forAllFilesSync(rootDirectory, func) {
  for (var _len2 = arguments.length, args = Array(_len2 > 2 ? _len2 - 2 : 0), _key2 = 2; _key2 < _len2; _key2++) {
    args[_key2 - 2] = arguments[_key2];
  }

  let rec = dir => {
    _fs2.default.readdirSync(dir).forEach(name => {
      let fullName = _path2.default.join(dir, name);
      let stats = _fs2.default.statSync(fullName);

      if (stats.isDirectory()) {
        rec(fullName);
        return;
      }

      if (stats.isFile()) {
        func(fullName, ...args);
        return;
      }
    });
  };

  rec(rootDirectory);
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9mb3ItYWxsLWZpbGVzLmpzIl0sIm5hbWVzIjpbImZvckFsbEZpbGVzIiwiZm9yQWxsRmlsZXNTeW5jIiwicm9vdERpcmVjdG9yeSIsImZ1bmMiLCJhcmdzIiwicmVjIiwiZGlyIiwiZW50cmllcyIsInJlYWRkaXIiLCJuYW1lIiwiZnVsbE5hbWUiLCJqb2luIiwic3RhdHMiLCJzdGF0IiwiaXNEaXJlY3RvcnkiLCJpc0ZpbGUiLCJyZWFkZGlyU3luYyIsImZvckVhY2giLCJzdGF0U3luYyJdLCJtYXBwaW5ncyI6Ijs7Ozs7UUFVZ0JBLFcsR0FBQUEsVztRQXFCQUMsZSxHQUFBQSxlOztBQS9CaEI7Ozs7QUFDQTs7OztBQUNBOzs7Ozs7QUFHQTs7Ozs7QUFLTyxTQUFTRCxXQUFULENBQXFCRSxhQUFyQixFQUFvQ0MsSUFBcEMsRUFBbUQ7QUFBQSxvQ0FBTkMsSUFBTTtBQUFOQSxRQUFNO0FBQUE7O0FBQ3hELE1BQUlDO0FBQUEsaUNBQU0sV0FBT0MsR0FBUCxFQUFlO0FBQ3ZCLFVBQUlDLFVBQVUsTUFBTSxhQUFJQyxPQUFKLENBQVlGLEdBQVosQ0FBcEI7O0FBRUEsV0FBSyxJQUFJRyxJQUFULElBQWlCRixPQUFqQixFQUEwQjtBQUN4QixZQUFJRyxXQUFXLGVBQUtDLElBQUwsQ0FBVUwsR0FBVixFQUFlRyxJQUFmLENBQWY7QUFDQSxZQUFJRyxRQUFRLE1BQU0sYUFBSUMsSUFBSixDQUFTSCxRQUFULENBQWxCOztBQUVBLFlBQUlFLE1BQU1FLFdBQU4sRUFBSixFQUF5QjtBQUN2QixnQkFBTVQsSUFBSUssUUFBSixDQUFOO0FBQ0Q7O0FBRUQsWUFBSUUsTUFBTUcsTUFBTixFQUFKLEVBQW9CO0FBQ2xCLGdCQUFNWixLQUFLTyxRQUFMLEVBQWUsR0FBR04sSUFBbEIsQ0FBTjtBQUNEO0FBQ0Y7QUFDRixLQWZHOztBQUFBO0FBQUE7QUFBQTtBQUFBLE1BQUo7O0FBaUJBLFNBQU9DLElBQUlILGFBQUosQ0FBUDtBQUNEOztBQUVNLFNBQVNELGVBQVQsQ0FBeUJDLGFBQXpCLEVBQXdDQyxJQUF4QyxFQUF1RDtBQUFBLHFDQUFOQyxJQUFNO0FBQU5BLFFBQU07QUFBQTs7QUFDNUQsTUFBSUMsTUFBT0MsR0FBRCxJQUFTO0FBQ2pCLGlCQUFHVSxXQUFILENBQWVWLEdBQWYsRUFBb0JXLE9BQXBCLENBQTZCUixJQUFELElBQVU7QUFDcEMsVUFBSUMsV0FBVyxlQUFLQyxJQUFMLENBQVVMLEdBQVYsRUFBZUcsSUFBZixDQUFmO0FBQ0EsVUFBSUcsUUFBUSxhQUFHTSxRQUFILENBQVlSLFFBQVosQ0FBWjs7QUFFQSxVQUFJRSxNQUFNRSxXQUFOLEVBQUosRUFBeUI7QUFDdkJULFlBQUlLLFFBQUo7QUFDQTtBQUNEOztBQUVELFVBQUlFLE1BQU1HLE1BQU4sRUFBSixFQUFvQjtBQUNsQlosYUFBS08sUUFBTCxFQUFlLEdBQUdOLElBQWxCO0FBQ0E7QUFDRDtBQUNGLEtBYkQ7QUFjRCxHQWZEOztBQWlCQUMsTUFBSUgsYUFBSjtBQUNEIiwiZmlsZSI6ImZvci1hbGwtZmlsZXMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZnMgZnJvbSAnZnMnO1xyXG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcclxuaW1wb3J0IHtwZnN9IGZyb20gJy4vcHJvbWlzZSc7XHJcblxyXG5cclxuLyoqXHJcbiAqIEludm9rZXMgYSBtZXRob2Qgb24gYWxsIGZpbGVzIGluIGEgZGlyZWN0b3J5IHJlY3Vyc2l2ZWx5LlxyXG4gKiBcclxuICogQHByaXZhdGVcclxuICovIFxyXG5leHBvcnQgZnVuY3Rpb24gZm9yQWxsRmlsZXMocm9vdERpcmVjdG9yeSwgZnVuYywgLi4uYXJncykge1xyXG4gIGxldCByZWMgPSBhc3luYyAoZGlyKSA9PiB7XHJcbiAgICBsZXQgZW50cmllcyA9IGF3YWl0IHBmcy5yZWFkZGlyKGRpcik7XHJcbiAgICBcclxuICAgIGZvciAobGV0IG5hbWUgb2YgZW50cmllcykge1xyXG4gICAgICBsZXQgZnVsbE5hbWUgPSBwYXRoLmpvaW4oZGlyLCBuYW1lKTtcclxuICAgICAgbGV0IHN0YXRzID0gYXdhaXQgcGZzLnN0YXQoZnVsbE5hbWUpO1xyXG5cclxuICAgICAgaWYgKHN0YXRzLmlzRGlyZWN0b3J5KCkpIHtcclxuICAgICAgICBhd2FpdCByZWMoZnVsbE5hbWUpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoc3RhdHMuaXNGaWxlKCkpIHtcclxuICAgICAgICBhd2FpdCBmdW5jKGZ1bGxOYW1lLCAuLi5hcmdzKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIHJldHVybiByZWMocm9vdERpcmVjdG9yeSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBmb3JBbGxGaWxlc1N5bmMocm9vdERpcmVjdG9yeSwgZnVuYywgLi4uYXJncykge1xyXG4gIGxldCByZWMgPSAoZGlyKSA9PiB7XHJcbiAgICBmcy5yZWFkZGlyU3luYyhkaXIpLmZvckVhY2goKG5hbWUpID0+IHtcclxuICAgICAgbGV0IGZ1bGxOYW1lID0gcGF0aC5qb2luKGRpciwgbmFtZSk7XHJcbiAgICAgIGxldCBzdGF0cyA9IGZzLnN0YXRTeW5jKGZ1bGxOYW1lKTtcclxuICAgICAgXHJcbiAgICAgIGlmIChzdGF0cy5pc0RpcmVjdG9yeSgpKSB7XHJcbiAgICAgICAgcmVjKGZ1bGxOYW1lKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIGlmIChzdGF0cy5pc0ZpbGUoKSkge1xyXG4gICAgICAgIGZ1bmMoZnVsbE5hbWUsIC4uLmFyZ3MpO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfTtcclxuICBcclxuICByZWMocm9vdERpcmVjdG9yeSk7XHJcbn1cclxuIl19