const electron = require('electron')
const keyboards = require('./keyboards.json')
// Module to control application life.
const {
    app,
    globalShortcut,
    ipcMain,
    webContents
} = electron

// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow
const remote = electron.remote;

const path = require('path')
const url = require('url')
const fs = require('fs');
require('electron-reload')(__dirname);
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
let vision

// User settings
let jsonPath
class Store {
    constructor(opts) {
        // Renderer process has to get `app` module via `remote`, whereas the main process can get it directly
        // app.getPath('userData') will return a string of the user's app data directory path.
        const userDataPath = (electron.app || electron.remote.app).getPath('userData');
        // We'll use the `configName` property to set the file name and path.join to bring it all together as a string
        this.path = path.join(userDataPath, opts.configName + '.json');
        console.log(this.path);
        jsonPath = this.path;
        global.userSettings = {json: jsonPath};
        this.data = parseDataFile(this.path, opts.defaults);
    }

    // This will just return the property on the `data` object
    get(key) {
        return this.data[key];
    }

    // ...and this will set it
    set(key, val) {
        this.data[key] = val;
        // Wait, I thought using the node.js' synchronous APIs was bad form?
        // We're not writing a server so there's not nearly the same IO demand on the process
        // Also if we used an async API and our app was quit before the asynchronous write had a chance to complete,
        // we might lose that data. Note that in a real app, we would try/catch this.
        fs.writeFileSync(this.path, JSON.stringify(this.data));
    }
}

function parseDataFile(filePath, defaults) {
    // We'll try/catch it in case the file doesn't exist yet, which will be the case on the first application run.
    // `fs.readFileSync` will return a JSON string which we then parse into a Javascript object
    try {
        return JSON.parse(fs.readFileSync(filePath));
    } catch (error) {
        // if there was some kind of error, return the passed in defaults instead.
        return defaults;
    }
}
// First instantiate the class
const store = new Store({
  configName: 'user-settings',
  defaults: {
        "api": "pollyRTC",
        "apis.responsiveVoiceRTC.voice": "UK English Female",
        "apis.responsiveVoiceRTC.rate": "1",
        "apis.responsiveVoiceRTC.pitch": "1.1",
        "apis.responsiveVoiceRTC.volume": "1",
        "apis.pollyRTC.awsRegion": "eu-west-1",
        "apis.pollyRTC.pollyVoiceId": "Amy",
        "mode": "sentence",
        "output": "null",
        "initialized": "false",
        "keyboard": "qwerty"
  }
});

store.set("initialized", "true");
// User settings

function createWindow() {

    const {
        width,
        height
    } = electron.screen.getPrimaryDisplay().workAreaSize
    // console.log(electron.screen.getPrimaryDisplay().workAreaSize.height);
    visionObj = {
        width: width,
        height: height,
        // x: function() {
        //     var x = (width/2) - (this.width/2);
        //     return x
        // },
        // y: function() {
        //     var y = height - this.height;
        //     return y
        // }
    }
    vision = new BrowserWindow({
        width: visionObj.width,
        height: visionObj.height,
        show: false,
        // x: visionObj.x(),
        // y: visionObj.y(),
        frame: false,
        resizable: false,
        alwaysOnTop: true,
        transparent: true,
        titleBarStyle: 'hidden', // macOS,
        icon: 'assets/images/clarence.png'
    })
    vision.loadURL(url.format({
        pathname: path.join(__dirname, 'vision.html'),
        protocol: 'file:',
        slashes: true
    }))
    vision.setIgnoreMouseEvents(true)
    mainWindow = new BrowserWindow({
        width: 1024,
        minWidth: 400,
        height: 576,
        minHeight: 400,
        maxHeight: 576,
        frame: false,
        show: true,
        resizable: true,
        backgroundColor: '#ffffff',
        titleBarStyle: 'hidden', // macOS,
        icon: 'assets/images/clarence.png'
    })
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }))
    mainWindow.focus();
    // mainWindow.webContents.openDevTools()
    mainWindow.on('closed', function() {
        globalShortcut.unregisterAll()
        vision.close()
        mainWindow = null
        vision = null
    })
    listenToShortcut();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function() {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', function() {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow()
    }
})
// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
var globalIsActive = false

function listenToShortcut() {
    // Register a 'CommandOrControl+X' shortcut listener.
    var modifier = "Shift"
    var characters = "abcdefghijklmnopqrstuvwxyz0123456789&-=%?.*')!@#$%^&(:<_>?~{|}`^;,-./[]\\\"".split("");
    globalShortcut.register('Alt+Enter', () => {
        mainWindow.webContents.send('clear-message');
        if (!globalIsActive) {
            initShortcuts(characters)
        } else {
            killShortcuts(characters)
        }
    })
    ipcMain.on('killEvents', () => {
        killShortcuts(characters)
    })
}

function initShortcuts(characters) {
    globalIsActive = true
    console.log("Listening Global Events");
    vision.showInactive()
    mainWindow.webContents.send('global-on');
    vision.webContents.send('global-on');
    characters.forEach(function(character) {
        // var shortcut = modifier+'+'+character
        globalShortcut.register(character, () => {
            console.log(character + ' is pressed')
            if (keyboards[character]) {
              mainWindow.webContents.send('shortcut', keyboards[character][store.get("keyboard")]);
              vision.webContents.send('shortcut', keyboards[character][store.get("keyboard")]);
            } else {
              mainWindow.webContents.send('shortcut', character);
              vision.webContents.send('shortcut', character);
            }
        })
    });
    globalShortcut.register('Space', () => {
        console.log('SPACE is pressed')
        mainWindow.webContents.send('shortcut-space', " ");
        vision.webContents.send('shortcut-space', " ");
    })
    globalShortcut.register('Backspace', () => {
        console.log('Backspace is pressed')
        mainWindow.webContents.send('shortcut-delete', "");
        vision.webContents.send('shortcut-delete', "");
    })
    globalShortcut.register('Enter', () => {
        console.log('Enter is pressed')
        mainWindow.webContents.send('shortcut-validate', "");
        vision.webContents.send('shortcut-validate', "");
    })
}

function killShortcuts(characters) {
    globalIsActive = false
    console.log("Removing Global Events");
    vision.hide()
    mainWindow.webContents.send('global-off');
    vision.webContents.send('global-off');
    characters.forEach(function(character) {
        globalShortcut.unregister(character)
    });
    globalShortcut.unregister('Space')
    globalShortcut.unregister('Backspace')
    globalShortcut.unregister('Enter')
}

// ipcMain.on('saveData', (event, parameters) => {
//     store.set(parameters.target, parameters.options);
// })


ipcMain.on('saveSettings', (event, parameters) => {
    store.set(parameters.target, parameters.options);
})
