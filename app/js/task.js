ipc = require('electron').ipcRenderer;
var fs = require("fs");
window.$ = window.jQuery = require('jquery');
const {dialog} = require('electron').remote
var config = require('../config/default');
var softname = config.App.softname;
document.title = "Добавление задания | " + softname

ipc.on('closing', () => {});

ipc.on('type', (event, type, rows) => { 
  updateElementsAccessibility(type);
  saveTypeRowsDom(type, rows);
});

ipc.on('edit', (event, task) => {
  if (task.name == 'parse_concurrents') {
    editParseConcurrents(task);
  } else if (task.name == 'filtration') {
    editFiltration(task);
  }
});

function editFiltration(task) {
  $("div.container").data('task', { _id: task._id, _rev: task._rev });
  updateElemView(['filtration']);
  document.getElementById("inputfile").value = task.inputfile;
  document.getElementById("followers_from").value = task.followers.from;
  document.getElementById("followers_to").value = task.followers.to;
  document.getElementById("publications_from").value = task.subscribers.from;
  document.getElementById("publications_to").value = task.subscribers.to;
  document.getElementById("subscribers_from").value = task.publications.from;
  document.getElementById("subscribers_to").value = task.publications.to;
  document.getElementById("stop_words_file").value = task.stop_words_file;
  document.getElementById("avatar").checked = task.anonym_profile; 
  document.getElementById("private").value =  task.private;
  document.getElementById("lastdate").value = task.lastdate;
  document.getElementById("filtered_accounts").value = task.outputfile;
}

function editParseConcurrents(task) {
  $("div.container").data('task', { _id: task._id, _rev: task._rev });
  updateElemView(['parse_concurrents']);
  document.getElementById("parsed_conc").value = task.parsed_conc.join('\n');
  document.getElementById("follow").checked = task.parse_type;
  document.getElementById("subscribe").checked = !task.parse_type;
  document.getElementById("max_limit").value = task.max_limit;
  document.getElementById("parsed_accounts").value = task.outputfile;
}

function updateElementsAccessibility(type) {
  if (type == 'user') {
    updateElemView(['parse_concurrents', 'filtration']);
  } else {
    updateElemView(['filtration']);
    disableCustomElem();
  }
}

function disableCustomElem() {
  $("#div_avatar").addClass("disabled");
  $("#avatar").prop("disabled", true);
  $("#proxy_file").prop("disabled", false);
  $("#proxy_file_button").prop("disabled", false);
}

function saveTypeRowsDom(type, rows) {
  $("div.container").attr('id', type);
  $("div.container").data('rows', rows);
}

function updateElemView(accessible) {
  $("#" + accessible[0] + "_tab").addClass('active');
  $("#" + accessible[0]).addClass('active');
  $("nav.nav-pills > a").each(function(index) {
    if ( accessible.indexOf( $(this).attr('id').slice(0, -4) ) === -1) {
      $(this).addClass("disabled");
    }
  });
}

function isEmpty(x) {
  if (x !== "") {
    return true;
  }
}

function parseConcurrents(taskName) {
  var containerRows = $("div.container").data('rows');


  // var to_parse_usernames = params[1].length;
  // var div = Math.floor(to_parse_usernames / users.length);
  // var rem = to_parse_usernames % users.length;
  // var dotation = [];
  // dotation[0] = rem + div;
  // for (var i = 1; i < users.length; i++) {
  //   dotation[i] = dotation[i-1]+div;
  // }
  // users.forEach( function(user, i , arr) {

  //   let db_object = {
  //     _id: user._id,
  //     username: user.username, 
  //     proxy: user.proxy,
  //     password: user.password,
  //     status: user.status,
  //     type: user.type,
  //     cookie: user.cookie,
  //     task: {
  //       name: taskName,
  //       outputfile: params[0], 
  //       parsed_conc: (i == 0) ? params[1].slice(0, dotation[i]) : params[1].slice(dotation[i-1], dotation[i]),
  //       max_limit: params[2], 
  //       parse_type: params[3]
  //     },
  //     _rev: user._rev 
  //   };

  // return db.put(db_object).then(function (result) {
  //      setTaskView(user._id, taskName);
  //    }).catch(function (err) {
  //      console.log(err);
  //    });
  //  });

  var followTrueSubscribeFalse = false;
  var concurParsed = document.getElementById("parsed_conc").value.split('\n');
  concurParsed = concurParsed.filter(isEmpty);
  if (document.getElementById("follow").checked == true) {
    followTrueSubscribeFalse = true;
  }
  var limit = document.getElementById("max_limit").value;
  var parsedAccountsFile = document.getElementById("parsed_accounts").value;

  const parse_concurrents_params = [parsedAccountsFile, concurParsed, limit, followTrueSubscribeFalse]; 
  const parse_concurrents_user = [ 'task_complete_event', containerRows, taskName].concat(parse_concurrents_params);
  ipc.send.apply(this, parse_concurrents_user);
  window.close();
}

function filtration(taskName) {
  var containerRows = $("div.container").data('rows');
  var inputfile = document.getElementById("inputfile").value;
  var followers_from = document.getElementById("followers_from").value;
  var followers_to = document.getElementById("followers_to").value;
  var subscribers_from = document.getElementById("subscribers_from").value;
  var subscribers_to = document.getElementById("subscribers_to").value;
  var publications_from = document.getElementById("publications_from").value;
  var publications_to = document.getElementById("publications_to").value;
  var stop_words_file = document.getElementById("stop_words_file").value;
  var avatar = document.getElementById("avatar").checked;
  var private = document.getElementById("private").value;

  if (document.getElementById ('date_checker').checked == true) {
    var lastdate = document.getElementById("lastdate").value;
  } else {
    var lastdate = "";
  }
  var filtered_accounts = document.getElementById("filtered_accounts").value;
  var proxy_file = document.getElementById("proxy_file").value;

  const filtration_params = [inputfile, followers_from, followers_to, subscribers_from, subscribers_to, publications_from, publications_to, stop_words_file, avatar,  private, lastdate , filtered_accounts, proxy_file];
  const filtration_params_task = ['add_task_event', taskName].concat(filtration_params);
  const filtration_params_user = [ 'task_complete_event', containerRows , taskName].concat(filtration_params);

  if ($("div.container").attr('id') == "task" ) {
    ipc.send.apply(this, filtration_params_task);
    window.close();
  } else { 
    ipc.send.apply(this, filtration_params_user);
    window.close();
  }
}

function completeTask(taskName) {
  if (taskName == 'parse_concurrents') {
    parseConcurrents(taskName);
  } else if (taskName == 'filtration') {
    filtration(taskName);
  }
}

function clearTextArea (selector) {
  document.getElementById(selector).value = "";
}

function openFile ( selector ) {
  var path = dialog.showOpenDialog({properties: ['openFile']}); // 'openDirectory'
  if (path) {
    document.getElementById(selector).value = path;
  } 
}

function openParse(selector) {
  var path = dialog.showOpenDialog({properties: ['openFile']}); // , 'openDirectory'
  readFile(path[0], function(data) {
    document.getElementById(selector).value = data;
  });
}

function readFile(filepath, cb) {
  fs.readFile(filepath, 'utf8', (err, data) => {
    if (err) throw err;
    return cb(data);
  });
}

function saveFile(selector) {
  var path = dialog.showSaveDialog();
  if (path) {
    document.getElementById(selector).value = path;
  }
}

document.getElementById("lastdate").disabled = true;
function checkDatePicker() {
  if (document.getElementById('date_checker').checked == true) {
     document.getElementById("lastdate").disabled = false;
  } else {
    document.getElementById("lastdate").disabled = true;
  }
}

