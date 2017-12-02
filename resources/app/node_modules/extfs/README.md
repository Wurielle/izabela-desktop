Extension for Node.js fs module
=========
 
##Table of Contents:

- [getDirs(path, cb)](#getDirs)
- [getDirsSync(path)](#getDirsSync)
- [isEmpty(path, cb)](#isEmpty)
- [isEmptySync(path)](#isEmptySync)
- [remove(path, cb)](#remove)
- [removeSync(path)](#removeSync)

## <a name="getDirs"></a>getDirs(path, cb)

Get all directories from a path

Example:

 ```javascript
var fs = require('extfs');

fs.getDirs('/home/myFolder', function (err, dirs) {
  if (err) {
    throw err;
  }
  console.log(dirs); // Array of directories
});
 ```

## <a name="getDirsSync"></a>getDirsSync(path)

(Synchronously) Get all directories from a path

Example:

```javascript
var fs = require('extfs');

var dirs = fs.getDirsSync('/home/myFolder');
console.log(dirs); // Array of directories
 ```

## <a name="isEmpty"></a>isEmpty(path, cb)

Check if a file or directory is empty.
A file is empty if not exists or not have any content.
A directory is empty if not exists or not have any file inside.

Example:

```javascript
var fs = require('extfs');

fs.isEmpty('/home/myFolder', function (empty) {
  console.log(empty);
});
 ```

## <a name="isEmptySync"></a>isEmptySync(path)

(Synchronously) Check if a file or directory is empty.
A file is empty if not exists or not have any content.
A directory is empty if not exists or not have any file inside.

Example:

```javascript
var fs = require('extfs');

var empty = fs.isEmptySync('/home/myFolder');
console.log(empty);
 ```

## <a name="remove"></a>remove(path, cb)

Remove a path or array of paths.
A path can be a file or directory.
If a directory is not empty, also removes its content.

Example:

```javascript
var fs = require('extfs');

fs.remove('/home/folder');
fs.remove([ '/home/folder1', '/hole/folder2', '/home/folder3' ]);
 ```

## <a name="removeSync"></a>removeSync(path, cb)

(Synchronously) Remove a path or array of paths.
A path can be a file or directory.
If a directory is not empty, also removes its content.

Example:

```javascript
var fs = require('extfs');

fs.removeSync('/home/folder', function (err) {
  console.log('Folder removed');
});
fs.remove([ '/home/folder1', '/hole/folder2', '/home/folder3' ], function (err) {
  console.log('Folders removed');
});
```