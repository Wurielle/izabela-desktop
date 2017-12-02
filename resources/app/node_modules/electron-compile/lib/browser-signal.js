'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.send = send;
exports.listen = listen;

var _Observable = require('rxjs/Observable');

var _Subject = require('rxjs/Subject');

require('rxjs/add/observable/throw');

const isElectron = 'type' in process;
const isBrowser = process.type === 'browser';

const ipc = !isElectron ? null : isBrowser ? require('electron').ipcMain : require('electron').ipcRenderer;

const channelList = {};

function send(channel) {
  for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    args[_key - 1] = arguments[_key];
  }

  if (isElectron && !isBrowser) {
    ipc.send(channel, ...args);
    return;
  }

  if (!(channel in channelList)) return;

  let subj = channelList[channel].subj;

  subj.next(args);
}

function listen(channel) {
  if (isElectron && !isBrowser) return _Observable.Observable.throw(new Error("Can only call listen from browser"));

  return _Observable.Observable.create(s => {
    if (!(channel in channelList)) {
      let subj = new _Subject.Subject();
      let ipcListener = function (e) {
        for (var _len2 = arguments.length, args = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
          args[_key2 - 1] = arguments[_key2];
        }

        subj.next(args);
      };

      channelList[channel] = { subj, refcount: 0 };
      if (isElectron && isBrowser) {
        ipc.on(channel, ipcListener);
        channelList[channel].listener = ipcListener;
      }
    }

    channelList[channel].refcount++;

    let disp = channelList[channel].subj.subscribe(s);
    disp.add(() => {
      channelList[channel].refcount--;
      if (channelList[channel].refcount > 0) return;

      if (channelList[channel].listener) {
        ipc.removeListener(channel, channelList[channel].listener);
      }

      delete channelList.channel;
    });

    return disp;
  });
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9icm93c2VyLXNpZ25hbC5qcyJdLCJuYW1lcyI6WyJzZW5kIiwibGlzdGVuIiwiaXNFbGVjdHJvbiIsInByb2Nlc3MiLCJpc0Jyb3dzZXIiLCJ0eXBlIiwiaXBjIiwicmVxdWlyZSIsImlwY01haW4iLCJpcGNSZW5kZXJlciIsImNoYW5uZWxMaXN0IiwiY2hhbm5lbCIsImFyZ3MiLCJzdWJqIiwibmV4dCIsInRocm93IiwiRXJyb3IiLCJjcmVhdGUiLCJzIiwiaXBjTGlzdGVuZXIiLCJlIiwicmVmY291bnQiLCJvbiIsImxpc3RlbmVyIiwiZGlzcCIsInN1YnNjcmliZSIsImFkZCIsInJlbW92ZUxpc3RlbmVyIl0sIm1hcHBpbmdzIjoiOzs7OztRQWFnQkEsSSxHQUFBQSxJO1FBWUFDLE0sR0FBQUEsTTs7QUF6QmhCOztBQUNBOztBQUVBOztBQUVBLE1BQU1DLGFBQWEsVUFBVUMsT0FBN0I7QUFDQSxNQUFNQyxZQUFZRCxRQUFRRSxJQUFSLEtBQWlCLFNBQW5DOztBQUVBLE1BQU1DLE1BQU0sQ0FBQ0osVUFBRCxHQUFjLElBQWQsR0FDVkUsWUFBWUcsUUFBUSxVQUFSLEVBQW9CQyxPQUFoQyxHQUEwQ0QsUUFBUSxVQUFSLEVBQW9CRSxXQURoRTs7QUFHQSxNQUFNQyxjQUFjLEVBQXBCOztBQUVPLFNBQVNWLElBQVQsQ0FBY1csT0FBZCxFQUFnQztBQUFBLG9DQUFOQyxJQUFNO0FBQU5BLFFBQU07QUFBQTs7QUFDckMsTUFBSVYsY0FBYyxDQUFDRSxTQUFuQixFQUE4QjtBQUM1QkUsUUFBSU4sSUFBSixDQUFTVyxPQUFULEVBQWtCLEdBQUdDLElBQXJCO0FBQ0E7QUFDRDs7QUFFRCxNQUFJLEVBQUVELFdBQVdELFdBQWIsQ0FBSixFQUErQjs7QUFOTSxNQVEvQkcsSUFSK0IsR0FRdEJILFlBQVlDLE9BQVosQ0FSc0IsQ0FRL0JFLElBUitCOztBQVNyQ0EsT0FBS0MsSUFBTCxDQUFVRixJQUFWO0FBQ0Q7O0FBRU0sU0FBU1gsTUFBVCxDQUFnQlUsT0FBaEIsRUFBeUI7QUFDOUIsTUFBSVQsY0FBYyxDQUFDRSxTQUFuQixFQUE4QixPQUFPLHVCQUFXVyxLQUFYLENBQWlCLElBQUlDLEtBQUosQ0FBVSxtQ0FBVixDQUFqQixDQUFQOztBQUU5QixTQUFPLHVCQUFXQyxNQUFYLENBQW1CQyxDQUFELElBQU87QUFDOUIsUUFBSSxFQUFFUCxXQUFXRCxXQUFiLENBQUosRUFBK0I7QUFDN0IsVUFBSUcsT0FBTyxzQkFBWDtBQUNBLFVBQUlNLGNBQWMsVUFBQ0MsQ0FBRCxFQUFnQjtBQUFBLDJDQUFUUixJQUFTO0FBQVRBLGNBQVM7QUFBQTs7QUFBRUMsYUFBS0MsSUFBTCxDQUFVRixJQUFWO0FBQWtCLE9BQXREOztBQUVBRixrQkFBWUMsT0FBWixJQUF1QixFQUFFRSxJQUFGLEVBQVFRLFVBQVUsQ0FBbEIsRUFBdkI7QUFDQSxVQUFJbkIsY0FBY0UsU0FBbEIsRUFBNkI7QUFDM0JFLFlBQUlnQixFQUFKLENBQU9YLE9BQVAsRUFBZ0JRLFdBQWhCO0FBQ0FULG9CQUFZQyxPQUFaLEVBQXFCWSxRQUFyQixHQUFnQ0osV0FBaEM7QUFDRDtBQUNGOztBQUVEVCxnQkFBWUMsT0FBWixFQUFxQlUsUUFBckI7O0FBRUEsUUFBSUcsT0FBT2QsWUFBWUMsT0FBWixFQUFxQkUsSUFBckIsQ0FBMEJZLFNBQTFCLENBQW9DUCxDQUFwQyxDQUFYO0FBQ0FNLFNBQUtFLEdBQUwsQ0FBUyxNQUFNO0FBQ2JoQixrQkFBWUMsT0FBWixFQUFxQlUsUUFBckI7QUFDQSxVQUFJWCxZQUFZQyxPQUFaLEVBQXFCVSxRQUFyQixHQUFnQyxDQUFwQyxFQUF1Qzs7QUFFdkMsVUFBSVgsWUFBWUMsT0FBWixFQUFxQlksUUFBekIsRUFBbUM7QUFDakNqQixZQUFJcUIsY0FBSixDQUFtQmhCLE9BQW5CLEVBQTRCRCxZQUFZQyxPQUFaLEVBQXFCWSxRQUFqRDtBQUNEOztBQUVELGFBQU9iLFlBQVlDLE9BQW5CO0FBQ0QsS0FURDs7QUFXQSxXQUFPYSxJQUFQO0FBQ0QsR0EzQk0sQ0FBUDtBQTRCRCIsImZpbGUiOiJicm93c2VyLXNpZ25hbC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7T2JzZXJ2YWJsZX0gZnJvbSAncnhqcy9PYnNlcnZhYmxlJztcclxuaW1wb3J0IHtTdWJqZWN0fSBmcm9tICdyeGpzL1N1YmplY3QnO1xyXG5cclxuaW1wb3J0ICdyeGpzL2FkZC9vYnNlcnZhYmxlL3Rocm93JztcclxuXHJcbmNvbnN0IGlzRWxlY3Ryb24gPSAndHlwZScgaW4gcHJvY2VzcztcclxuY29uc3QgaXNCcm93c2VyID0gcHJvY2Vzcy50eXBlID09PSAnYnJvd3Nlcic7XHJcblxyXG5jb25zdCBpcGMgPSAhaXNFbGVjdHJvbiA/IG51bGwgOlxyXG4gIGlzQnJvd3NlciA/IHJlcXVpcmUoJ2VsZWN0cm9uJykuaXBjTWFpbiA6IHJlcXVpcmUoJ2VsZWN0cm9uJykuaXBjUmVuZGVyZXI7XHJcblxyXG5jb25zdCBjaGFubmVsTGlzdCA9IHt9O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHNlbmQoY2hhbm5lbCwgLi4uYXJncykge1xyXG4gIGlmIChpc0VsZWN0cm9uICYmICFpc0Jyb3dzZXIpIHtcclxuICAgIGlwYy5zZW5kKGNoYW5uZWwsIC4uLmFyZ3MpO1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgaWYgKCEoY2hhbm5lbCBpbiBjaGFubmVsTGlzdCkpIHJldHVybjtcclxuXHJcbiAgbGV0IHsgc3ViaiB9ID0gY2hhbm5lbExpc3RbY2hhbm5lbF07XHJcbiAgc3Viai5uZXh0KGFyZ3MpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbGlzdGVuKGNoYW5uZWwpIHtcclxuICBpZiAoaXNFbGVjdHJvbiAmJiAhaXNCcm93c2VyKSByZXR1cm4gT2JzZXJ2YWJsZS50aHJvdyhuZXcgRXJyb3IoXCJDYW4gb25seSBjYWxsIGxpc3RlbiBmcm9tIGJyb3dzZXJcIikpO1xyXG5cclxuICByZXR1cm4gT2JzZXJ2YWJsZS5jcmVhdGUoKHMpID0+IHtcclxuICAgIGlmICghKGNoYW5uZWwgaW4gY2hhbm5lbExpc3QpKSB7XHJcbiAgICAgIGxldCBzdWJqID0gbmV3IFN1YmplY3QoKTtcclxuICAgICAgbGV0IGlwY0xpc3RlbmVyID0gKGUsIC4uLmFyZ3MpID0+IHsgc3Viai5uZXh0KGFyZ3MpOyB9O1xyXG5cclxuICAgICAgY2hhbm5lbExpc3RbY2hhbm5lbF0gPSB7IHN1YmosIHJlZmNvdW50OiAwIH07XHJcbiAgICAgIGlmIChpc0VsZWN0cm9uICYmIGlzQnJvd3Nlcikge1xyXG4gICAgICAgIGlwYy5vbihjaGFubmVsLCBpcGNMaXN0ZW5lcik7XHJcbiAgICAgICAgY2hhbm5lbExpc3RbY2hhbm5lbF0ubGlzdGVuZXIgPSBpcGNMaXN0ZW5lcjtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGNoYW5uZWxMaXN0W2NoYW5uZWxdLnJlZmNvdW50Kys7XHJcblxyXG4gICAgbGV0IGRpc3AgPSBjaGFubmVsTGlzdFtjaGFubmVsXS5zdWJqLnN1YnNjcmliZShzKTtcclxuICAgIGRpc3AuYWRkKCgpID0+IHtcclxuICAgICAgY2hhbm5lbExpc3RbY2hhbm5lbF0ucmVmY291bnQtLTtcclxuICAgICAgaWYgKGNoYW5uZWxMaXN0W2NoYW5uZWxdLnJlZmNvdW50ID4gMCkgcmV0dXJuO1xyXG5cclxuICAgICAgaWYgKGNoYW5uZWxMaXN0W2NoYW5uZWxdLmxpc3RlbmVyKSB7XHJcbiAgICAgICAgaXBjLnJlbW92ZUxpc3RlbmVyKGNoYW5uZWwsIGNoYW5uZWxMaXN0W2NoYW5uZWxdLmxpc3RlbmVyKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgZGVsZXRlIGNoYW5uZWxMaXN0LmNoYW5uZWw7XHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gZGlzcDtcclxuICB9KTtcclxufVxyXG4iXX0=