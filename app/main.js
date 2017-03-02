
'use strict';

const electron = require('electron');
const ipc = require('electron').ipcMain; 
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const path = require('path');
const url = require('url');
var log = require('electron-log');
var config = require('./config/default');
const devIsOpen = config.App.devTools;

const autoUpdater = require("electron-updater").autoUpdater;
autoUpdater.logger = require("electron-log")
autoUpdater.logger.transports.file.level = "info"

var mainWindow = null;

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
  mainWindow = new BrowserWindow({width: 800, height: 600}); // , show: false
  mainWindow.setMenu(null)
   
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }));
  mainWindow.on('close', function() {
    mainWindow = null;
  });
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('sync_db');
    // mainWindow.show();
  })
  openDevTool(mainWindow, devIsOpen);
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
