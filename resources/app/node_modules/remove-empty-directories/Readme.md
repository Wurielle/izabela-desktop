# Remove Empty directories [![Build Status](https://travis-ci.org/danielhusar/remove-empty-directories.svg)](https://travis-ci.org/danielhusar/remove-empty-directories)

Remove all empty directories from the provided folder.
Its all sync as its a lot easier to do it this way :)
It will return array of removed directories.

It will not remove the passed directory itself.

## Install

#### [npm](https://npmjs.org/package/remove-empty-directories)

```bash
npm install --save remove-empty-directories
```

### Sample usage

```javascript
var removeDirectories = require('remove-empty-directories');
var removed = removeDirectories('public');
```
### CLI

You can also use it as a CLI app by installing it globally:


```bash
npm install --global remove-empty-directories
```

```bash
$ remove-directories --help

Usage:
  $ remove-directories --public
  $ remove-directories --public/assets
```


## Options

#### path

Type: `String`  
Default: ''

Path where to look for empty directories


## License

MIT © Daniel Husar
