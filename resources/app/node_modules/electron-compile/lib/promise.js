'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.pzlib = exports.pfs = undefined;

var _pify = require('pify');

var _pify2 = _interopRequireDefault(_pify);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// NB: We do this so that every module doesn't have to run pify
// on fs and zlib


/**
 * @private
 */
const pfs = exports.pfs = (0, _pify2.default)(require('fs'));

/**
 * @private
 */
const pzlib = exports.pzlib = (0, _pify2.default)(require('zlib'));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9wcm9taXNlLmpzIl0sIm5hbWVzIjpbInBmcyIsInJlcXVpcmUiLCJwemxpYiJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFBOzs7Ozs7QUFFQTtBQUNBOzs7QUFHQTs7O0FBR08sTUFBTUEsb0JBQU0sb0JBQUtDLFFBQVEsSUFBUixDQUFMLENBQVo7O0FBRVA7OztBQUdPLE1BQU1DLHdCQUFRLG9CQUFLRCxRQUFRLE1BQVIsQ0FBTCxDQUFkIiwiZmlsZSI6InByb21pc2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgcGlmeSBmcm9tICdwaWZ5JztcclxuXHJcbi8vIE5COiBXZSBkbyB0aGlzIHNvIHRoYXQgZXZlcnkgbW9kdWxlIGRvZXNuJ3QgaGF2ZSB0byBydW4gcGlmeVxyXG4vLyBvbiBmcyBhbmQgemxpYlxyXG5cclxuXHJcbi8qKlxyXG4gKiBAcHJpdmF0ZVxyXG4gKi8gXHJcbmV4cG9ydCBjb25zdCBwZnMgPSBwaWZ5KHJlcXVpcmUoJ2ZzJykpO1xyXG5cclxuLyoqXHJcbiAqIEBwcml2YXRlXHJcbiAqLyBcclxuZXhwb3J0IGNvbnN0IHB6bGliID0gcGlmeShyZXF1aXJlKCd6bGliJykpO1xyXG4iXX0=