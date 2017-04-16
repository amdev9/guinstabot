ipc = require('electron').ipcRenderer;
var fs = require("fs");
var os = require('os'), EOL = os.EOL;
window.$ = window.jQuery = require('jquery');
var config = require('../config/default');
const {dialog} = require('electron').remote;
var softname = config.App.softname;
document.title = "Добавить аккаунты | " + softname

ipc.on('closing', () => {});

ipc.on('selected_accounts', (event, message) => {
  var test = document.getElementById("test");
  for (var n = 0; n < message.length; n ++) {
    test.innerHTML += message[n] + "<br>";
  }
});

function isEmpty(x) {
  if (x !== "") {
    return true;
  }
}

function openFile(selector) {
  var path = dialog.showOpenDialog({properties: ['openFile']});
  if (path) {
    document.getElementById(selector).value = path;
  }
}

function parseDataFileToArray(selector) {
  var filename = document.getElementById(selector).value;
  if(fs.existsSync(filename)) {
    fs.readFile(filename, function(err, f) {
      if(err) throw err;
      var array = f.toString().split(EOL).filter(isEmpty);
      ipc.send('users_add', array);
      // console.log(array)
      window.close(); 
    });
  } else {
    dialog.showMessageBox({ 
      message: `Файл не найден: ${filename}`,
      buttons: ["OK"] 
    });
  }
}
