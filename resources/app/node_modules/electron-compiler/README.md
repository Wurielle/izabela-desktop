# electron-compiler #

Copy, uglify, minify and package [Electron](http://electron.atom.io) projects.

## How It Works

1. Copies application repository to a temporary location.
2. Uglifies JavaScript and CSS files.
3. Installs npm dependencies in a temporary location.
4. Updates build version in package.json.
5. Packages the application using [electron-packager](https://github.com/electron-userland/electron-packager).

## Installation

    npm install electron-compiler

## Usage

    electron-compiler <path-to-app>

## Options

Compiler options are read from an electron_compiler.json file in the application's repository.

    {
        "verifyConfig": true | false,   // Whether to verify configuration before starting build. (Default: true)
        "archiveOutput" true | false,   // Whether to archive electron packager output for Windows and Linux. (Default: true)
        "platforms": [],                // Array or platforms to compile for. Supported options: win32, linux, darwin 
        "uglifyList": [],               // Array of paths to uglify. JavaScript and CSS files are supported.
        "ignoreList": [],               // Array of files to ignore. 
        "versionString":                // Object containing electron packager settings for Windows build.
        {
            "CompanyName": "Company",
            "FileDescription": "Application description.",
            "OriginalFilename": "Filename.exe",
            "ProductName": "Product",
            "InternalName": "Internal Name"
        }
    }

## Output

The compiler output of each platform from electron-packager is saved to .\releases.

## Third Party Libraries

* Packaging - [electron-packager](https://github.com/electron-userland/electron-packager)
* File system - [fs-extra](https://github.com/jprichardson/node-fs-extra)
* JSON beautifying - [js-beautify](https://github.com/beautify-web/js-beautify)
* JavaScript uglifying - [babel](https://babeljs.io/)
* CSS minifaction - [minifier](https://github.com/fizker/minifier)
* Removing empty directories - [remove-empty-directories](https://github.com/danielhusar/remove-empty-directories)
* User prompts - [prompt](https://github.com/flatiron/prompt)
* Archiving - [zip-folder](https://github.com/sole/node-zip-folder)
* Log colours - [colors](https://github.com/Marak/colors.js)
* Package info - [pkginfo](https://github.com/indexzero/node-pkginfo)
