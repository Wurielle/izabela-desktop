'use strict';

var _configParser = require('./config-parser');

var configParser = _interopRequireWildcard(_configParser);

var _compilerHost = require('./compiler-host');

var _compilerHost2 = _interopRequireDefault(_compilerHost);

var _fileChangeCache = require('./file-change-cache');

var _fileChangeCache2 = _interopRequireDefault(_fileChangeCache);

var _compileCache = require('./compile-cache');

var _compileCache2 = _interopRequireDefault(_compileCache);

var _protocolHook = require('./protocol-hook');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

//import {enableLiveReload} from './live-reload';
//import {watchPath} from './pathwatcher-rx';

let enableLiveReload = null;
let watchPath = null;

module.exports = Object.assign({
  // NB: delay-load live-reload so we don't load RxJS in production
  enableLiveReload: function () {
    enableLiveReload = enableLiveReload || require('./live-reload').enableLiveReload;
    return enableLiveReload(...arguments);
  },
  watchPath: function () {
    watchPath = watchPath || require('./pathwatcher-rx').watchPath;
    return watchPath(...arguments);
  }
}, configParser, { CompilerHost: _compilerHost2.default, FileChangedCache: _fileChangeCache2.default, CompileCache: _compileCache2.default, addBypassChecker: _protocolHook.addBypassChecker });
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6WyJjb25maWdQYXJzZXIiLCJlbmFibGVMaXZlUmVsb2FkIiwid2F0Y2hQYXRoIiwibW9kdWxlIiwiZXhwb3J0cyIsIk9iamVjdCIsImFzc2lnbiIsInJlcXVpcmUiLCJDb21waWxlckhvc3QiLCJGaWxlQ2hhbmdlZENhY2hlIiwiQ29tcGlsZUNhY2hlIiwiYWRkQnlwYXNzQ2hlY2tlciJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7SUFBWUEsWTs7QUFFWjs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7Ozs7O0FBQ0E7QUFDQTs7QUFFQSxJQUFJQyxtQkFBbUIsSUFBdkI7QUFDQSxJQUFJQyxZQUFZLElBQWhCOztBQUVBQyxPQUFPQyxPQUFQLEdBQWlCQyxPQUFPQyxNQUFQLENBQWM7QUFDN0I7QUFDQUwsb0JBQWtCLFlBQWtCO0FBQ2xDQSx1QkFBbUJBLG9CQUFvQk0sUUFBUSxlQUFSLEVBQXlCTixnQkFBaEU7QUFDQSxXQUFPQSxpQkFBaUIsWUFBakIsQ0FBUDtBQUNELEdBTDRCO0FBTTdCQyxhQUFXLFlBQWtCO0FBQzNCQSxnQkFBWUEsYUFBYUssUUFBUSxrQkFBUixFQUE0QkwsU0FBckQ7QUFDQSxXQUFPQSxVQUFVLFlBQVYsQ0FBUDtBQUNEO0FBVDRCLENBQWQsRUFXZkYsWUFYZSxFQVlmLEVBQUVRLG9DQUFGLEVBQWdCQywyQ0FBaEIsRUFBa0NDLG9DQUFsQyxFQUFnREMsZ0RBQWhELEVBWmUsQ0FBakIiLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjb25maWdQYXJzZXIgZnJvbSAnLi9jb25maWctcGFyc2VyJztcclxuXHJcbmltcG9ydCBDb21waWxlckhvc3QgZnJvbSAnLi9jb21waWxlci1ob3N0JztcclxuaW1wb3J0IEZpbGVDaGFuZ2VkQ2FjaGUgZnJvbSAnLi9maWxlLWNoYW5nZS1jYWNoZSc7XHJcbmltcG9ydCBDb21waWxlQ2FjaGUgZnJvbSAnLi9jb21waWxlLWNhY2hlJztcclxuaW1wb3J0IHthZGRCeXBhc3NDaGVja2VyfSBmcm9tICcuL3Byb3RvY29sLWhvb2snO1xyXG4vL2ltcG9ydCB7ZW5hYmxlTGl2ZVJlbG9hZH0gZnJvbSAnLi9saXZlLXJlbG9hZCc7XHJcbi8vaW1wb3J0IHt3YXRjaFBhdGh9IGZyb20gJy4vcGF0aHdhdGNoZXItcngnO1xyXG5cclxubGV0IGVuYWJsZUxpdmVSZWxvYWQgPSBudWxsO1xyXG5sZXQgd2F0Y2hQYXRoID0gbnVsbDtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gT2JqZWN0LmFzc2lnbih7XHJcbiAgLy8gTkI6IGRlbGF5LWxvYWQgbGl2ZS1yZWxvYWQgc28gd2UgZG9uJ3QgbG9hZCBSeEpTIGluIHByb2R1Y3Rpb25cclxuICBlbmFibGVMaXZlUmVsb2FkOiBmdW5jdGlvbiguLi5hcmdzKSB7XHJcbiAgICBlbmFibGVMaXZlUmVsb2FkID0gZW5hYmxlTGl2ZVJlbG9hZCB8fCByZXF1aXJlKCcuL2xpdmUtcmVsb2FkJykuZW5hYmxlTGl2ZVJlbG9hZDtcclxuICAgIHJldHVybiBlbmFibGVMaXZlUmVsb2FkKC4uLmFyZ3MpO1xyXG4gIH0sXHJcbiAgd2F0Y2hQYXRoOiBmdW5jdGlvbiguLi5hcmdzKSB7XHJcbiAgICB3YXRjaFBhdGggPSB3YXRjaFBhdGggfHwgcmVxdWlyZSgnLi9wYXRod2F0Y2hlci1yeCcpLndhdGNoUGF0aDtcclxuICAgIHJldHVybiB3YXRjaFBhdGgoLi4uYXJncyk7XHJcbiAgfSxcclxufSxcclxuICBjb25maWdQYXJzZXIsXHJcbiAgeyBDb21waWxlckhvc3QsIEZpbGVDaGFuZ2VkQ2FjaGUsIENvbXBpbGVDYWNoZSwgYWRkQnlwYXNzQ2hlY2tlciB9XHJcbik7XHJcbiJdfQ==