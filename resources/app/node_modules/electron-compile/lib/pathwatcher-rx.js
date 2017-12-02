'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.watchPathDirect = watchPathDirect;
exports.watchPath = watchPath;

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _Observable = require('rxjs/Observable');

var _Subscription = require('rxjs/Subscription');

var _lruCache = require('lru-cache');

var _lruCache2 = _interopRequireDefault(_lruCache);

require('rxjs/add/operator/publish');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function watchPathDirect(directory) {
  return _Observable.Observable.create(subj => {
    let dead = false;

    const watcher = _fs2.default.watch(directory, {}, (eventType, fileName) => {
      if (dead) return;
      subj.next({ eventType, fileName });
    });

    watcher.on('error', e => {
      dead = true;
      subj.error(e);
    });

    return new _Subscription.Subscription(() => {
      if (!dead) {
        watcher.close();
      }
    });
  });
}

const pathCache = new _lruCache2.default({ length: 256 });
function watchPath(directory) {
  let ret = pathCache.get(directory);
  if (ret) return ret;

  ret = watchPathDirect(directory).publish().refCount();
  pathCache.set(directory, ret);
  return ret;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9wYXRod2F0Y2hlci1yeC5qcyJdLCJuYW1lcyI6WyJ3YXRjaFBhdGhEaXJlY3QiLCJ3YXRjaFBhdGgiLCJkaXJlY3RvcnkiLCJjcmVhdGUiLCJzdWJqIiwiZGVhZCIsIndhdGNoZXIiLCJ3YXRjaCIsImV2ZW50VHlwZSIsImZpbGVOYW1lIiwibmV4dCIsIm9uIiwiZSIsImVycm9yIiwiY2xvc2UiLCJwYXRoQ2FjaGUiLCJsZW5ndGgiLCJyZXQiLCJnZXQiLCJwdWJsaXNoIiwicmVmQ291bnQiLCJzZXQiXSwibWFwcGluZ3MiOiI7Ozs7O1FBT2dCQSxlLEdBQUFBLGU7UUFtQkFDLFMsR0FBQUEsUzs7QUExQmhCOzs7O0FBQ0E7O0FBQ0E7O0FBQ0E7Ozs7QUFFQTs7OztBQUVPLFNBQVNELGVBQVQsQ0FBeUJFLFNBQXpCLEVBQW9DO0FBQ3pDLFNBQU8sdUJBQVdDLE1BQVgsQ0FBbUJDLElBQUQsSUFBVTtBQUNqQyxRQUFJQyxPQUFPLEtBQVg7O0FBRUEsVUFBTUMsVUFBVSxhQUFHQyxLQUFILENBQVNMLFNBQVQsRUFBb0IsRUFBcEIsRUFBd0IsQ0FBQ00sU0FBRCxFQUFZQyxRQUFaLEtBQXlCO0FBQy9ELFVBQUlKLElBQUosRUFBVTtBQUNWRCxXQUFLTSxJQUFMLENBQVUsRUFBQ0YsU0FBRCxFQUFZQyxRQUFaLEVBQVY7QUFDRCxLQUhlLENBQWhCOztBQUtBSCxZQUFRSyxFQUFSLENBQVcsT0FBWCxFQUFxQkMsQ0FBRCxJQUFPO0FBQ3pCUCxhQUFPLElBQVA7QUFDQUQsV0FBS1MsS0FBTCxDQUFXRCxDQUFYO0FBQ0QsS0FIRDs7QUFLQSxXQUFPLCtCQUFpQixNQUFNO0FBQUUsVUFBSSxDQUFDUCxJQUFMLEVBQVc7QUFBRUMsZ0JBQVFRLEtBQVI7QUFBa0I7QUFBRSxLQUExRCxDQUFQO0FBQ0QsR0FkTSxDQUFQO0FBZUQ7O0FBRUQsTUFBTUMsWUFBWSx1QkFBUSxFQUFFQyxRQUFRLEdBQVYsRUFBUixDQUFsQjtBQUNPLFNBQVNmLFNBQVQsQ0FBbUJDLFNBQW5CLEVBQThCO0FBQ25DLE1BQUllLE1BQU1GLFVBQVVHLEdBQVYsQ0FBY2hCLFNBQWQsQ0FBVjtBQUNBLE1BQUllLEdBQUosRUFBUyxPQUFPQSxHQUFQOztBQUVUQSxRQUFNakIsZ0JBQWdCRSxTQUFoQixFQUEyQmlCLE9BQTNCLEdBQXFDQyxRQUFyQyxFQUFOO0FBQ0FMLFlBQVVNLEdBQVYsQ0FBY25CLFNBQWQsRUFBeUJlLEdBQXpCO0FBQ0EsU0FBT0EsR0FBUDtBQUNEIiwiZmlsZSI6InBhdGh3YXRjaGVyLXJ4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGZzIGZyb20gJ2ZzJztcclxuaW1wb3J0IHtPYnNlcnZhYmxlfSBmcm9tICdyeGpzL09ic2VydmFibGUnO1xyXG5pbXBvcnQge1N1YnNjcmlwdGlvbn0gZnJvbSAncnhqcy9TdWJzY3JpcHRpb24nO1xyXG5pbXBvcnQgTFJVIGZyb20gJ2xydS1jYWNoZSc7XHJcblxyXG5pbXBvcnQgJ3J4anMvYWRkL29wZXJhdG9yL3B1Ymxpc2gnO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHdhdGNoUGF0aERpcmVjdChkaXJlY3RvcnkpIHtcclxuICByZXR1cm4gT2JzZXJ2YWJsZS5jcmVhdGUoKHN1YmopID0+IHtcclxuICAgIGxldCBkZWFkID0gZmFsc2U7XHJcblxyXG4gICAgY29uc3Qgd2F0Y2hlciA9IGZzLndhdGNoKGRpcmVjdG9yeSwge30sIChldmVudFR5cGUsIGZpbGVOYW1lKSA9PiB7XHJcbiAgICAgIGlmIChkZWFkKSByZXR1cm47XHJcbiAgICAgIHN1YmoubmV4dCh7ZXZlbnRUeXBlLCBmaWxlTmFtZX0pO1xyXG4gICAgfSk7XHJcblxyXG4gICAgd2F0Y2hlci5vbignZXJyb3InLCAoZSkgPT4ge1xyXG4gICAgICBkZWFkID0gdHJ1ZTtcclxuICAgICAgc3Viai5lcnJvcihlKTtcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiBuZXcgU3Vic2NyaXB0aW9uKCgpID0+IHsgaWYgKCFkZWFkKSB7IHdhdGNoZXIuY2xvc2UoKTsgfSB9KTtcclxuICB9KTtcclxufVxyXG5cclxuY29uc3QgcGF0aENhY2hlID0gbmV3IExSVSh7IGxlbmd0aDogMjU2IH0pO1xyXG5leHBvcnQgZnVuY3Rpb24gd2F0Y2hQYXRoKGRpcmVjdG9yeSkge1xyXG4gIGxldCByZXQgPSBwYXRoQ2FjaGUuZ2V0KGRpcmVjdG9yeSk7XHJcbiAgaWYgKHJldCkgcmV0dXJuIHJldDtcclxuXHJcbiAgcmV0ID0gd2F0Y2hQYXRoRGlyZWN0KGRpcmVjdG9yeSkucHVibGlzaCgpLnJlZkNvdW50KCk7XHJcbiAgcGF0aENhY2hlLnNldChkaXJlY3RvcnksIHJldCk7XHJcbiAgcmV0dXJuIHJldDtcclxufVxyXG4iXX0=