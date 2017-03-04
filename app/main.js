if(require('electron-squirrel-startup')) return;

const electron = require('electron');
const ipc = require('electron').ipcMain; 
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const autoUpdater = electron.autoUpdater;
const dialog = electron.dialog;
const Menu = electron.Menu;
const path = require('path');
const url = require('url');
var config = require('./config/default');
const devIsOpen = config.App.devTools;
const os = require('os');

let template = []
const name = app.getName();
if (process.platform === 'darwin') {
  // OS X
  template.unshift({
    label: name,
    submenu: [
      {
        label: 'About ' + name,
        role: 'about'
      },
      {
        label: 'Quit',
        accelerator: 'Command+Q',
        click() { app.quit(); }
      },
      {
        label: "Edit",
        submenu: [
          { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
          { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
          { type: "separator" },
          { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
          { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
          { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
          { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" }
      ]}
    ]
  })
} else {
  // Win test?
  template = [{
    label: name,
    submenu: [
        { label: "About Application", selector: "orderFrontStandardAboutPanel:" },
        { type: "separator" },
        { label: "Quit", accelerator: "Command+Q", click: function() { app.quit(); }}
    ]}, {
    label: "Edit",
    submenu: [
        { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
        { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
        { type: "separator" },
        { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
        { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
        { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
        { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" }
    ]}
  ];
}

let mainWindow;
function createDefaultWindow() {
  mainWindow = new BrowserWindow({width: 800, height: 600}); // , show: false
  // mainWindow.setMenu(null)
   
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

  let platform = 'win';
  if (process.platform === 'darwin') {
    platform = 'osx';
  }
  if (platform == 'osx') {
    autoUpdater.setFeedURL(`http://192.168.1.33:5014/update/${platform}_${os.arch()}/${app.getVersion()}`);
  } else if (platform == 'win') {
    autoUpdater.setFeedURL(`http://192.168.1.33:5014/update/${platform}_${os.arch()}/${app.getVersion()}/RELEASES`);
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

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

// function sendStatus(text) {
//   mainWindow.webContents.send('message', text);
// }

autoUpdater.on('checking-for-update', () => {
  // sendStatus('Выполняется проверка обновлений...');
})
autoUpdater.on('update-available', (ev, info) => {
  // sendStatus('Доступно обновление.');
})
autoUpdater.on('update-not-available', (ev, info) => {
  // sendStatus('Обновления отсутствуют.');
})
autoUpdater.on('error', (ev, err) => {
  dialog.showErrorBox('Ошибка обновления', 'Произошла ошибка при обновлении программы')

  // sendStatus('Ошибка при обновлении.');
  // sendStatus(err); // no need
})
autoUpdater.on('download-progress', (ev, progressObj) => {
  // sendStatus('Скачиваем обновление...');
  // sendStatus('progressObj', progressObj); // no need
})

autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
  let message = 'Доступно обновление ' + app.getName() + ' ' + releaseName + ' . Оно будет установлено при следующем запуске программы.';
  if (releaseNotes) {
    const splitNotes = releaseNotes.split(/[^\r]\n/);
    message += '\n\nОписание обновления:\n';
    splitNotes.forEach(notes => {
      message += notes + '\n\n';
    });
  }
  dialog.showMessageBox({
    type: 'question',
    buttons: ['Установить и перезапустить', 'Позже'],
    defaultId: 0,
    message: 'Обновление ' + app.getName() + ' было загружено',
    detail: message
  }, response => {
    if (response === 0) {
      setTimeout(() => autoUpdater.quitAndInstall(), 1);
    }
  });
});

setTimeout(function() {
  autoUpdater.checkForUpdates()
}, 1000);