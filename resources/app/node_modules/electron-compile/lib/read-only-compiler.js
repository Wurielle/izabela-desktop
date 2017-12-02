"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

/**
 * ReadOnlyCompiler is a compiler which allows the host to inject all of the compiler
 * metadata information so that {@link CompileCache} et al are able to recreate the
 * hash without having two separate code paths.
 */
class ReadOnlyCompiler {
  /**
   * Creates a ReadOnlyCompiler instance
   *
   * @private
   */
  constructor(name, compilerVersion, compilerOptions, inputMimeTypes) {
    Object.assign(this, { name, compilerVersion, compilerOptions, inputMimeTypes });
  }

  shouldCompileFile() {
    return _asyncToGenerator(function* () {
      return true;
    })();
  }
  determineDependentFiles() {
    return _asyncToGenerator(function* () {
      return [];
    })();
  }

  compile() {
    return _asyncToGenerator(function* () {
      throw new Error("Read-only compilers can't compile");
    })();
  }

  shouldCompileFileSync() {
    return true;
  }
  determineDependentFilesSync() {
    return [];
  }

  compileSync() {
    throw new Error("Read-only compilers can't compile");
  }

  getCompilerVersion() {
    return this.compilerVersion;
  }
}
exports.default = ReadOnlyCompiler;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9yZWFkLW9ubHktY29tcGlsZXIuanMiXSwibmFtZXMiOlsiUmVhZE9ubHlDb21waWxlciIsImNvbnN0cnVjdG9yIiwibmFtZSIsImNvbXBpbGVyVmVyc2lvbiIsImNvbXBpbGVyT3B0aW9ucyIsImlucHV0TWltZVR5cGVzIiwiT2JqZWN0IiwiYXNzaWduIiwic2hvdWxkQ29tcGlsZUZpbGUiLCJkZXRlcm1pbmVEZXBlbmRlbnRGaWxlcyIsImNvbXBpbGUiLCJFcnJvciIsInNob3VsZENvbXBpbGVGaWxlU3luYyIsImRldGVybWluZURlcGVuZGVudEZpbGVzU3luYyIsImNvbXBpbGVTeW5jIiwiZ2V0Q29tcGlsZXJWZXJzaW9uIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBOzs7OztBQUtlLE1BQU1BLGdCQUFOLENBQXVCO0FBQ3BDOzs7OztBQUtBQyxjQUFZQyxJQUFaLEVBQWtCQyxlQUFsQixFQUFtQ0MsZUFBbkMsRUFBb0RDLGNBQXBELEVBQW9FO0FBQ2xFQyxXQUFPQyxNQUFQLENBQWMsSUFBZCxFQUFvQixFQUFFTCxJQUFGLEVBQVFDLGVBQVIsRUFBeUJDLGVBQXpCLEVBQTBDQyxjQUExQyxFQUFwQjtBQUNEOztBQUVLRyxtQkFBTixHQUEwQjtBQUFBO0FBQUUsYUFBTyxJQUFQO0FBQUY7QUFBZ0I7QUFDcENDLHlCQUFOLEdBQWdDO0FBQUE7QUFBRSxhQUFPLEVBQVA7QUFBRjtBQUFjOztBQUV4Q0MsU0FBTixHQUFnQjtBQUFBO0FBQ2QsWUFBTSxJQUFJQyxLQUFKLENBQVUsbUNBQVYsQ0FBTjtBQURjO0FBRWY7O0FBRURDLDBCQUF3QjtBQUFFLFdBQU8sSUFBUDtBQUFjO0FBQ3hDQyxnQ0FBOEI7QUFBRSxXQUFPLEVBQVA7QUFBWTs7QUFFNUNDLGdCQUFjO0FBQ1osVUFBTSxJQUFJSCxLQUFKLENBQVUsbUNBQVYsQ0FBTjtBQUNEOztBQUVESSx1QkFBcUI7QUFDbkIsV0FBTyxLQUFLWixlQUFaO0FBQ0Q7QUExQm1DO2tCQUFqQkgsZ0IiLCJmaWxlIjoicmVhZC1vbmx5LWNvbXBpbGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFJlYWRPbmx5Q29tcGlsZXIgaXMgYSBjb21waWxlciB3aGljaCBhbGxvd3MgdGhlIGhvc3QgdG8gaW5qZWN0IGFsbCBvZiB0aGUgY29tcGlsZXJcclxuICogbWV0YWRhdGEgaW5mb3JtYXRpb24gc28gdGhhdCB7QGxpbmsgQ29tcGlsZUNhY2hlfSBldCBhbCBhcmUgYWJsZSB0byByZWNyZWF0ZSB0aGVcclxuICogaGFzaCB3aXRob3V0IGhhdmluZyB0d28gc2VwYXJhdGUgY29kZSBwYXRocy5cclxuICovXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJlYWRPbmx5Q29tcGlsZXIge1xyXG4gIC8qKlxyXG4gICAqIENyZWF0ZXMgYSBSZWFkT25seUNvbXBpbGVyIGluc3RhbmNlXHJcbiAgICpcclxuICAgKiBAcHJpdmF0ZVxyXG4gICAqL1xyXG4gIGNvbnN0cnVjdG9yKG5hbWUsIGNvbXBpbGVyVmVyc2lvbiwgY29tcGlsZXJPcHRpb25zLCBpbnB1dE1pbWVUeXBlcykge1xyXG4gICAgT2JqZWN0LmFzc2lnbih0aGlzLCB7IG5hbWUsIGNvbXBpbGVyVmVyc2lvbiwgY29tcGlsZXJPcHRpb25zLCBpbnB1dE1pbWVUeXBlcyB9KTtcclxuICB9XHJcblxyXG4gIGFzeW5jIHNob3VsZENvbXBpbGVGaWxlKCkgeyByZXR1cm4gdHJ1ZTsgfVxyXG4gIGFzeW5jIGRldGVybWluZURlcGVuZGVudEZpbGVzKCkgeyByZXR1cm4gW107IH1cclxuXHJcbiAgYXN5bmMgY29tcGlsZSgpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcihcIlJlYWQtb25seSBjb21waWxlcnMgY2FuJ3QgY29tcGlsZVwiKTtcclxuICB9XHJcblxyXG4gIHNob3VsZENvbXBpbGVGaWxlU3luYygpIHsgcmV0dXJuIHRydWU7IH1cclxuICBkZXRlcm1pbmVEZXBlbmRlbnRGaWxlc1N5bmMoKSB7IHJldHVybiBbXTsgfVxyXG5cclxuICBjb21waWxlU3luYygpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcihcIlJlYWQtb25seSBjb21waWxlcnMgY2FuJ3QgY29tcGlsZVwiKTtcclxuICB9XHJcblxyXG4gIGdldENvbXBpbGVyVmVyc2lvbigpIHtcclxuICAgIHJldHVybiB0aGlzLmNvbXBpbGVyVmVyc2lvbjtcclxuICB9XHJcbn1cclxuIl19