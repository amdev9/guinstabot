if(require('electron-squirrel-startup')) return;

const electron = require('electron');
const ipc = require('electron').ipcMain; 
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const autoUpdater = electron.autoUpdater;
const path = require('path');
const url = require('url');
var config = require('./config/default');
const devIsOpen = config.App.devTools;
const os = require('os');

// >>??
// let template = []
// if (process.platform === 'darwin') {
//   // OS X
//   const name = app.getName();
//   template.unshift({
//     label: name,
//     submenu: [
//       {
//         label: 'About ' + name,
//         role: 'about'
//       },
//       {
//         label: 'Quit',
//         accelerator: 'Command+Q',
//         click() { app.quit(); }
//       },
//     ]
//   })
// }


let mainWindow;
function createDefaultWindow() {

  mainWindow = new BrowserWindow({width: 800, height: 600}); // , show: false
  mainWindow.setMenu(null)
   
  mainWindow.loadURL(`file://${__dirname}/index.html#v${app.getVersion()}`);
  mainWindow.on('closed', function() {
    mainWindow = null;
  });
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('sync_db');
    // mainWindow.show();
  })
  openDevTool(mainWindow, devIsOpen);
  return mainWindow;
}

ipc.on('users_add', (event, users) => {
  mainWindow.webContents.send('add', users);
});

ipc.on('user_edit', (event, user) => {
  mainWindow.webContents.send('edit', user);
});

ipc.on('add_task_event', (event, tasks, users) => {
  mainWindow.webContents.send('add_task', tasks, users);
});

app.on('window-all-closed', function() {
  if (process.platform != 'darwin') {
    app.quit();
  }
});

app.on('ready', function() {
  //////////////////////
  // AUTO-UPDATE SECTION
  //////////////////////
  let platform = 'win';
  if (process.platform === 'darwin') {
    platform = 'osx';
  }
  if (platform == 'osx') {
    autoUpdater.setFeedURL(`http://192.168.1.33:5014/update/${platform}_${os.arch()}/${app.getVersion()}`);
  } else if (platform == 'win') {
    autoUpdater.setFeedURL(`http://192.168.1.33:5014/update/${platform}_${os.arch()}/${app.getVersion()}/RELEASES`);
  }
  //////////////////////
  createDefaultWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});

function openDevTool(win, isOpen) {
  if (isOpen) {
    win.webContents.openDevTools()
  } else {
    win.webContents.on("devtools-opened", () => {
      win.webContents.closeDevTools();
    });
  }
}

function sendStatus(text) {
  mainWindow.webContents.send('message', text);
}

//-------------------------------------------------------------------
// Auto updates
//-------------------------------------------------------------------
autoUpdater.on('checking-for-update', () => {
  sendStatus('Checking for update...');
})
autoUpdater.on('update-available', (ev, info) => {
  sendStatus('Update available.');
})
autoUpdater.on('update-not-available', (ev, info) => {
  sendStatus('Update not available.');
})
autoUpdater.on('error', (ev, err) => {
  sendStatus('Error in auto-updater.');
  sendStatus(err); // no need
})
autoUpdater.on('download-progress', (ev, progressObj) => {
  sendStatus('Download progress...');
  sendStatus('progressObj', progressObj); // no need
})
autoUpdater.on('update-downloaded', (ev, info) => {
  sendStatus('Update downloaded.  Will quit and install in 5 seconds.');
  // Wait 5 seconds, then quit and install
  setTimeout(function() {
    autoUpdater.quitAndInstall();  
  }, 5000)
})
// Wait 3 second for the window to exist before checking for updates.
setTimeout(function() {
  autoUpdater.checkForUpdates()  
}, 3000);