const electron = require('electron')
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow

const ipc = require('electron').ipcMain
const path = require('path')
const url = require('url')
const fs = require('fs')
const Store = require('electron-store')
const config = new Store({cwd: 'C:\\Export\\'})
const cmd = require('node-cmd')

const configNew = {
  'testKey': "Don't panic, this is just a test",
  'defaultPath': 'C://Export/download.dnl',
  'big': {
    'printer': '\\\\ulbw2k812\\ulbps101',
    'label': {
      'width': 99970,
      'height': 48920
    },
    'pdfName': 'printBig.pdf'
  },
  'small': {
    'printer': '\\\\ulbw2k812\\ulbps124',
    'label': {
      'width': 74500,
      'height': 23500
    },
    'pdfName': 'printSmall.pdf'
  },
  'devMode': false
}

// name of signature storage json
const sigJSON = 'signaturen.json'

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
let savedData

// creates the mainWindow
function createWindow () {
  checkConfig()
  checkTmpDir()
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 800, height: 580})

  // and load the index.html of the app.
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))
  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
    deleteJSON()
  })
}

// deletes the signature storage json
function deleteJSON () {
  if (fs.existsSync(sigJSON)) {
    fs.unlink(sigJSON, function (err) {
      if (err) {
        throw err
      } else {
        console.log(sigJSON + ' wurde geloescht')
      }
    })
  }
}

// checks if config file exists, else creates one
function checkConfig () {
  if (fs.existsSync('C:\\Export\\config.json')) {
    if (!config.has('defaultPath')) {
      createConfig()
    }
  } else {
    createConfig()
  }
}
// checks if the tmp-dir exists, else creates it
function checkTmpDir () {
  try {
    fs.mkdirSync('./tmp')
  } catch (err) {
    if (err.code !== 'EEXIST') throw err
  }
}

// creates new config.json
function createConfig () {
  config.set(configNew)
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// starts the printing process
ipc.on('print', function (event, data) {
  savedData = data
  if (savedData.big || savedData.small) {
    try {
      if (savedData.big) {
        printBig(savedData.big)
      }
      if (savedData.small) {
        printSmall(savedData.small)
      }
      // mainWindow.webContents.send('printed', true)
    } catch (error) {
      throw error
    }
  }
})

// closes the application
ipc.on('close', function (event) {
  mainWindow.close()
  app.quit()
})

// listens on printed, invokes then printMsg via ipc
ipc.on('printed', function (event) {
  mainWindow.webContents.send('printMsg', true)
})

// invokes the generating and printing of printBig.pdf
function printBig (data) {
  let winBig = null
  winBig = new BrowserWindow({ heihgt: 225, width: 500, show: false })
  winBig.loadURL(url.format({
    pathname: path.join(__dirname, 'print.html'),
    protocol: 'file:',
    slashes: true
  }))
  winBig.once('ready-to-show', () => {
    winBig.webContents.send('toPrint', data)

    // generates a pdf file which is then printed silently via Foxit Reader v6.2.3.0815
    winBig.webContents.printToPDF({marginsType: 2, landscape: true, pageSize: { width: config.store.big.label.height, height: config.store.big.label.width }}, (error, data) => {
      if (error) throw error
      fs.writeFile('./tmp/' + config.store.big.pdfName, data, (error) => {
        if (error) throw error
        console.log('Wrote ' + config.store.big.pdfName + ' successfully')
        if (!config.store.devMode) {
          // printing with Foxit Reader 6.2.3.0815 via node-cmd
          cmd.get(
            // '"C:\\Program Files (x86)\\SumatraPDF\\SumatraPDF.exe" -print-to "\\\\http://jenlbs6-sun23.thulb.uni-jena.de:631\\SigGross" -print-settings "noscale" ".\\tmp\\printBig.pdf"',
            '"C:\\Program Files (x86)\\Foxit Software\\Foxit Reader\\Foxit Reader.exe"' + ' /t .\\tmp\\' + config.store.big.pdfName + ' ' + config.store.big.printer,
            function (err, data, stderr) {
              if (!err) {
                console.log('all good ', data)
              } else {
                throw error
              }
            }
          )
        }
      })
    })
    if (config.store.devMode) {
      winBig.show()
    }
    winBig = null
  })
}

// invokes the generating and printing of printSmall.pdf
function printSmall (data) {
  let winSmall = null
  winSmall = new BrowserWindow({width: 225, height: 500, show: false})
  winSmall.loadURL(url.format({
    pathname: path.join(__dirname, 'print.html'),
    protocol: 'file:',
    slashes: true
  }))
  winSmall.once('ready-to-show', () => {
    winSmall.webContents.send('toPrint', data)
    winSmall.webContents.printToPDF({marginsType: 2, landscape: true, pageSize: { width: config.store.small.label.height, height: config.store.small.label.width }}, (error, data) => {
      if (error) throw error
      fs.writeFile('./tmp/' + config.store.small.pdfName, data, (error) => {
        if (error) throw error
        console.log('Wrote' + config.store.small.pdfName + ' successfully')

        if (!config.store.devMode) {
          // printing with Foxit Reader 6.2.3.0815 via node-cmd
          cmd.get(
            // '"C:\\Program Files (x86)\\SumatraPDF\\SumatraPDF.exe" -print-to "\\\\http://jenlbs6-sun23.thulb.uni-jena.de:631\\SigGross" -print-settings "noscale" ".\\tmp\\printBig.pdf"',
            '"C:\\Program Files (x86)\\Foxit Software\\Foxit Reader\\Foxit Reader.exe"' + ' /t .\\tmp\\' + config.store.small.pdfName + ' ' + config.store.small.printer,
            function (err, data, stderr) {
              if (!err) {
                console.log('all good ', data)
              } else {
                throw error
              }
            }
          )
        }
      })
    })
    if (config.store.devMode) {
      winSmall.show()
    }
    winSmall = null
  })
}

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
