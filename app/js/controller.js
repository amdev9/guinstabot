//////////////////////////////////
///////////// CONTROLLER /////////
//////////////////////////////////

'use strict';

var path = require('path');
const url = require('url');
const BrowserWindow = require('electron').remote.BrowserWindow;
const {dialog} = require('electron').remote;

function checkSecurityController(cb) {
  if (1 != 1) {
    cb("success");
  } else {
    cb("failure");
  }
}

function editUserController(user) { 
  if (user.length == 0) {
    dialog.showMessageBox({ 
      message: "Пользователь не выбран",
      buttons: ["OK"] 
    });
  } else if (user.length > 1) {
    dialog.showMessageBox({ 
      message: "Выберите одного пользователя",
      buttons: ["OK"] 
    });
  } else if (user.length == 1) {
    let editView = new BrowserWindow({width: 600, height: 300, frame: true});
    editView.setMenu(null)
    editView.loadURL(url.format({
      pathname: path.join(__dirname, 'edit.html'),
      protocol: 'file:',
      slashes: true
    }))
    editView.on('closed', function() {
      editView = null;
    });
    editView.webContents.on('did-finish-load', () => {
      /// FIX check for length and if more then 1 -> error window
      getUserDb(user[0], editView.webContents ); 
    });
    editView.webContents.openDevTools();
  }
}

function tasksController(action, rows) {
  let taskView = new BrowserWindow({width: 600, height: 500, frame: true});
  taskView.setMenu(null)
  taskView.loadURL(url.format({
    pathname: path.join(__dirname, 'task.html'),
    protocol: 'file:',
    slashes: true
  }))
  taskView.on('closed', function() {
    taskView = null;
    // deleteUserTaskDb(); 
  });
  taskView.webContents.on('did-finish-load', () => {

    if (action == "add" && rows.length > 0) {
      taskView.webContents.send('type', 'user');
      createUserTaskDb(rows);
    } else if (action == "add" && rows.length == 0) {
      taskView.webContents.send('type', 'task');
    } else if (action == "edit" && rows.length == 1) {
      getTaskDb(rows[0], taskView.webContents);
    }
  });
  taskView.webContents.openDevTools();
}

function showLogsController(rows) {
  rows.forEach(function (row_id) {
    var l_filepath = __dirname + "/logs/" +  row_id + ".txt";
    if (fs.existsSync(l_filepath) ) {
    let loggerView = new BrowserWindow({width: 600, height: 300, frame: true});
    loggerView.setMenu(null)
    loggerView.loadURL(url.format({
      pathname: path.join(__dirname, 'log.html'),
      protocol: 'file:',
      slashes: true
    }))

    loggerView.on('closed', function() {
      loggerView = null;
    });
    loggerView.webContents.on('did-finish-load', () => {
      loggerView.webContents.send('log_data', l_filepath, row_id);
    });
    loggerView.webContents.openDevTools();
  } else {
    dialog.showMessageBox({ 
      message: `Логи для ${row_id} отсутствуют`,
      buttons: ["OK"] 
    });
  }
  });
}

function addUsersController() {
  let addView = new BrowserWindow({width: 600, height: 300,frame: true})
  addView.setMenu(null)
  addView.loadURL(url.format({
    pathname: path.join(__dirname, 'add.html'),
    protocol: 'file:',
    slashes: true
  }))
  addView.on('closed', function() {
    addView = null;
  })
  addView.webContents.openDevTools()    
}
