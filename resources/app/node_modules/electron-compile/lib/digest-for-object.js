'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = createDigestForObject;

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function updateDigestForJsonValue(shasum, value) {
  // Implmentation is similar to that of pretty-printing a JSON object, except:
  // * Strings are not escaped.
  // * No effort is made to avoid trailing commas.
  // These shortcuts should not affect the correctness of this function.
  const type = typeof value;

  if (type === 'string') {
    shasum.update('"', 'utf8');
    shasum.update(value, 'utf8');
    shasum.update('"', 'utf8');
    return;
  }

  if (type === 'boolean' || type === 'number') {
    shasum.update(value.toString(), 'utf8');
    return;
  }

  if (!value) {
    shasum.update('null', 'utf8');
    return;
  }

  if (Array.isArray(value)) {
    shasum.update('[', 'utf8');
    for (let i = 0; i < value.length; i++) {
      updateDigestForJsonValue(shasum, value[i]);
      shasum.update(',', 'utf8');
    }
    shasum.update(']', 'utf8');
    return;
  }

  // value must be an object: be sure to sort the keys.
  let keys = Object.keys(value);
  keys.sort();

  shasum.update('{', 'utf8');

  for (let i = 0; i < keys.length; i++) {
    updateDigestForJsonValue(shasum, keys[i]);
    shasum.update(': ', 'utf8');
    updateDigestForJsonValue(shasum, value[keys[i]]);
    shasum.update(',', 'utf8');
  }

  shasum.update('}', 'utf8');
}

/**
 * Creates a hash from a JS object
 * 
 * @private  
 */
function createDigestForObject(obj) {
  let sha1 = _crypto2.default.createHash('sha1');
  updateDigestForJsonValue(sha1, obj);

  return sha1.digest('hex');
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9kaWdlc3QtZm9yLW9iamVjdC5qcyJdLCJuYW1lcyI6WyJjcmVhdGVEaWdlc3RGb3JPYmplY3QiLCJ1cGRhdGVEaWdlc3RGb3JKc29uVmFsdWUiLCJzaGFzdW0iLCJ2YWx1ZSIsInR5cGUiLCJ1cGRhdGUiLCJ0b1N0cmluZyIsIkFycmF5IiwiaXNBcnJheSIsImkiLCJsZW5ndGgiLCJrZXlzIiwiT2JqZWN0Iiwic29ydCIsIm9iaiIsInNoYTEiLCJjcmVhdGVIYXNoIiwiZGlnZXN0Il0sIm1hcHBpbmdzIjoiOzs7OztrQkEwRHdCQSxxQjs7QUExRHhCOzs7Ozs7QUFFQSxTQUFTQyx3QkFBVCxDQUFrQ0MsTUFBbEMsRUFBMENDLEtBQTFDLEVBQWlEO0FBQy9DO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsUUFBTUMsT0FBTyxPQUFPRCxLQUFwQjs7QUFFQSxNQUFJQyxTQUFTLFFBQWIsRUFBdUI7QUFDckJGLFdBQU9HLE1BQVAsQ0FBYyxHQUFkLEVBQW1CLE1BQW5CO0FBQ0FILFdBQU9HLE1BQVAsQ0FBY0YsS0FBZCxFQUFxQixNQUFyQjtBQUNBRCxXQUFPRyxNQUFQLENBQWMsR0FBZCxFQUFtQixNQUFuQjtBQUNBO0FBQ0Q7O0FBRUQsTUFBSUQsU0FBUyxTQUFULElBQXNCQSxTQUFTLFFBQW5DLEVBQTZDO0FBQzNDRixXQUFPRyxNQUFQLENBQWNGLE1BQU1HLFFBQU4sRUFBZCxFQUFnQyxNQUFoQztBQUNBO0FBQ0Q7O0FBRUQsTUFBSSxDQUFDSCxLQUFMLEVBQVk7QUFDVkQsV0FBT0csTUFBUCxDQUFjLE1BQWQsRUFBc0IsTUFBdEI7QUFDQTtBQUNEOztBQUVELE1BQUlFLE1BQU1DLE9BQU4sQ0FBY0wsS0FBZCxDQUFKLEVBQTBCO0FBQ3hCRCxXQUFPRyxNQUFQLENBQWMsR0FBZCxFQUFtQixNQUFuQjtBQUNBLFNBQUssSUFBSUksSUFBRSxDQUFYLEVBQWNBLElBQUlOLE1BQU1PLE1BQXhCLEVBQWdDRCxHQUFoQyxFQUFxQztBQUNuQ1IsK0JBQXlCQyxNQUF6QixFQUFpQ0MsTUFBTU0sQ0FBTixDQUFqQztBQUNBUCxhQUFPRyxNQUFQLENBQWMsR0FBZCxFQUFtQixNQUFuQjtBQUNEO0FBQ0RILFdBQU9HLE1BQVAsQ0FBYyxHQUFkLEVBQW1CLE1BQW5CO0FBQ0E7QUFDRDs7QUFFRDtBQUNBLE1BQUlNLE9BQU9DLE9BQU9ELElBQVAsQ0FBWVIsS0FBWixDQUFYO0FBQ0FRLE9BQUtFLElBQUw7O0FBRUFYLFNBQU9HLE1BQVAsQ0FBYyxHQUFkLEVBQW1CLE1BQW5COztBQUVBLE9BQUssSUFBSUksSUFBRSxDQUFYLEVBQWNBLElBQUlFLEtBQUtELE1BQXZCLEVBQStCRCxHQUEvQixFQUFvQztBQUNsQ1IsNkJBQXlCQyxNQUF6QixFQUFpQ1MsS0FBS0YsQ0FBTCxDQUFqQztBQUNBUCxXQUFPRyxNQUFQLENBQWMsSUFBZCxFQUFvQixNQUFwQjtBQUNBSiw2QkFBeUJDLE1BQXpCLEVBQWlDQyxNQUFNUSxLQUFLRixDQUFMLENBQU4sQ0FBakM7QUFDQVAsV0FBT0csTUFBUCxDQUFjLEdBQWQsRUFBbUIsTUFBbkI7QUFDRDs7QUFFREgsU0FBT0csTUFBUCxDQUFjLEdBQWQsRUFBbUIsTUFBbkI7QUFDRDs7QUFHRDs7Ozs7QUFLZSxTQUFTTCxxQkFBVCxDQUErQmMsR0FBL0IsRUFBb0M7QUFDakQsTUFBSUMsT0FBTyxpQkFBT0MsVUFBUCxDQUFrQixNQUFsQixDQUFYO0FBQ0FmLDJCQUF5QmMsSUFBekIsRUFBK0JELEdBQS9COztBQUVBLFNBQU9DLEtBQUtFLE1BQUwsQ0FBWSxLQUFaLENBQVA7QUFDRCIsImZpbGUiOiJkaWdlc3QtZm9yLW9iamVjdC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjcnlwdG8gZnJvbSAnY3J5cHRvJztcclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZURpZ2VzdEZvckpzb25WYWx1ZShzaGFzdW0sIHZhbHVlKSB7XHJcbiAgLy8gSW1wbG1lbnRhdGlvbiBpcyBzaW1pbGFyIHRvIHRoYXQgb2YgcHJldHR5LXByaW50aW5nIGEgSlNPTiBvYmplY3QsIGV4Y2VwdDpcclxuICAvLyAqIFN0cmluZ3MgYXJlIG5vdCBlc2NhcGVkLlxyXG4gIC8vICogTm8gZWZmb3J0IGlzIG1hZGUgdG8gYXZvaWQgdHJhaWxpbmcgY29tbWFzLlxyXG4gIC8vIFRoZXNlIHNob3J0Y3V0cyBzaG91bGQgbm90IGFmZmVjdCB0aGUgY29ycmVjdG5lc3Mgb2YgdGhpcyBmdW5jdGlvbi5cclxuICBjb25zdCB0eXBlID0gdHlwZW9mKHZhbHVlKTtcclxuXHJcbiAgaWYgKHR5cGUgPT09ICdzdHJpbmcnKSB7XHJcbiAgICBzaGFzdW0udXBkYXRlKCdcIicsICd1dGY4Jyk7XHJcbiAgICBzaGFzdW0udXBkYXRlKHZhbHVlLCAndXRmOCcpO1xyXG4gICAgc2hhc3VtLnVwZGF0ZSgnXCInLCAndXRmOCcpO1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgaWYgKHR5cGUgPT09ICdib29sZWFuJyB8fCB0eXBlID09PSAnbnVtYmVyJykge1xyXG4gICAgc2hhc3VtLnVwZGF0ZSh2YWx1ZS50b1N0cmluZygpLCAndXRmOCcpO1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgaWYgKCF2YWx1ZSkge1xyXG4gICAgc2hhc3VtLnVwZGF0ZSgnbnVsbCcsICd1dGY4Jyk7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcclxuICAgIHNoYXN1bS51cGRhdGUoJ1snLCAndXRmOCcpO1xyXG4gICAgZm9yIChsZXQgaT0wOyBpIDwgdmFsdWUubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdXBkYXRlRGlnZXN0Rm9ySnNvblZhbHVlKHNoYXN1bSwgdmFsdWVbaV0pO1xyXG4gICAgICBzaGFzdW0udXBkYXRlKCcsJywgJ3V0ZjgnKTtcclxuICAgIH1cclxuICAgIHNoYXN1bS51cGRhdGUoJ10nLCAndXRmOCcpO1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgLy8gdmFsdWUgbXVzdCBiZSBhbiBvYmplY3Q6IGJlIHN1cmUgdG8gc29ydCB0aGUga2V5cy5cclxuICBsZXQga2V5cyA9IE9iamVjdC5rZXlzKHZhbHVlKTtcclxuICBrZXlzLnNvcnQoKTtcclxuXHJcbiAgc2hhc3VtLnVwZGF0ZSgneycsICd1dGY4Jyk7XHJcblxyXG4gIGZvciAobGV0IGk9MDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcclxuICAgIHVwZGF0ZURpZ2VzdEZvckpzb25WYWx1ZShzaGFzdW0sIGtleXNbaV0pO1xyXG4gICAgc2hhc3VtLnVwZGF0ZSgnOiAnLCAndXRmOCcpO1xyXG4gICAgdXBkYXRlRGlnZXN0Rm9ySnNvblZhbHVlKHNoYXN1bSwgdmFsdWVba2V5c1tpXV0pO1xyXG4gICAgc2hhc3VtLnVwZGF0ZSgnLCcsICd1dGY4Jyk7XHJcbiAgfVxyXG5cclxuICBzaGFzdW0udXBkYXRlKCd9JywgJ3V0ZjgnKTtcclxufVxyXG5cclxuXHJcbi8qKlxyXG4gKiBDcmVhdGVzIGEgaGFzaCBmcm9tIGEgSlMgb2JqZWN0XHJcbiAqIFxyXG4gKiBAcHJpdmF0ZSAgXHJcbiAqLyBcclxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY3JlYXRlRGlnZXN0Rm9yT2JqZWN0KG9iaikge1xyXG4gIGxldCBzaGExID0gY3J5cHRvLmNyZWF0ZUhhc2goJ3NoYTEnKTtcclxuICB1cGRhdGVEaWdlc3RGb3JKc29uVmFsdWUoc2hhMSwgb2JqKTtcclxuICBcclxuICByZXR1cm4gc2hhMS5kaWdlc3QoJ2hleCcpO1xyXG59XHJcbiJdfQ==