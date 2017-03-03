ipc = require('electron').ipcRenderer;
var fs = require("fs");
var Promise = require('bluebird');
var readFilePromise = Promise.promisify(require("fs").readFile);
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

ipc.on('edit', (event, item) => {

  if (item.type == 'user') {
    var rows = [];
    rows.push(item._id);
    saveTypeRowsDom('user', rows);
    
    var user = item;  
    if (user.task.name == 'parse_concurrents') {
      editParseConcurrents(user.task);
    } else if (user.task.name == 'filtration') {
      editFiltration(user.task);
    }

  } else {

    var rows = { _id: item._id, _rev: item._rev };
    saveTypeRowsDom('task', rows);

    var task = item;
    if (task.name == 'parse_concurrents') {
      editParseConcurrents(task);
    } else if (task.name == 'filtration') {
      updateElementsAccessibility('task');
      editFiltration(task);
    }
  }
});

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
  $("div.container").data(type, rows);
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

function clearTextArea (selector) {
  document.getElementById(selector).value = "";
}

function openFile(selector) {
  var path = dialog.showOpenDialog({properties: ['openFile']}); 
  if (path) {
    document.getElementById(selector).value = path;
  } 
}

function openParse(selector) {
  var path = dialog.showOpenDialog({properties: ['openFile']}); 
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

function isEmpty(x) {
  if (x !== "") {
    return true;
  }
}

function editFiltration(task) {

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
  document.getElementById("proxy_file").value = task.proxy_file;
}

function editParseConcurrents(task) {

  updateElemView(['parse_concurrents']);
  document.getElementById("parsed_conc").value = task.parsed_conc.join('\n');
  document.getElementById("follow").checked = task.parse_type;
  document.getElementById("subscribe").checked = !task.parse_type;
  document.getElementById("max_limit").value = task.max_limit;
  document.getElementById("parsed_accounts").value = task.outputfile;
}



function filtrationUiData(taskName) {
  this.name = taskName;
  this.inputfile = document.getElementById("inputfile").value;
  this.followers = {
    from: document.getElementById("followers_from").value,
    to: document.getElementById("followers_to").value
  };
  this.subscribers = {
    from: document.getElementById("subscribers_from").value,
    to: document.getElementById("subscribers_to").value
  };
  this.publications = {
    from: document.getElementById("publications_from").value,
    to: document.getElementById("publications_to").value
  };
  this.stop_words_file = document.getElementById("stop_words_file").value;
  this.anonym_profile = document.getElementById("avatar").checked;
  this.private = document.getElementById("private").value;
  if (document.getElementById ('date_checker').checked == true) {
    var lastdate = document.getElementById("lastdate").value;
  } else {
    var lastdate = "";
  }
  this.lastdate = lastdate;
  this.outputfile = document.getElementById("filtered_accounts").value;
  this.proxy_file = document.getElementById("proxy_file").value;
}

function filtrationUser(taskName) {

  var users = $("div.container").data('user');
  var dotation = [];
  var tasks = [];  
  var task0 = new filtrationUiData(taskName);
  var concurParsed = [];
  readFilePromise(task0.inputfile, 'utf8').then(function(data) {
    concurParsed = data.split('\n');
    concurParsed = concurParsed.filter(isEmpty);
    var to_parse_usernames = concurParsed.length;
    var div = Math.floor(to_parse_usernames / users.length);
    var rem = to_parse_usernames % users.length;
    dotation[0] = rem + div;
    tasks.push(task0);
    task0.input_array = concurParsed.slice(0, dotation[0]);      
    for (var i = 1; i < users.length; i++) {
      var taskI = new filtrationUiData(taskName);
      dotation[i] = dotation[i-1]+div;
      taskI.input_array = concurParsed.slice(dotation[i-1], dotation[i]);
      tasks.push(taskI);
    }
    console.log(tasks);
    ipc.send('add_task_event', tasks, users);
    window.close();
  });
}

function filtrationTask(taskName) {

  var task = new filtrationUiData(taskName);
  task.type = 'task';
  task.status = '-';
  var domContainer = $("div.container").data('task');
  if (domContainer) {
    task._id = domContainer._id;
    task._rev = domContainer._rev;
  } else {
    task._id = new Date().toISOString();
  }

  readFilePromise(task.inputfile, 'utf8').then(function(data) {
    var parsed_array = [];
    parsed_array = data.split('\n');
    parsed_array = parsed_array.filter(isEmpty);

    task.input_array = parsed_array;
    var proxyParsed = [];
    readFilePromise(task.proxy_file, 'utf8').then(function(data) {
      proxyParsed = data.split('\n');
      proxyParsed = proxyParsed.filter(isEmpty);

       
      if (proxyParsed.length > 0) {
        var to_parse_usernames = parsed_array.length;
        var div = Math.floor(to_parse_usernames / (proxyParsed.length) );
        var rem = to_parse_usernames % (proxyParsed.length);
        var partition = new Array(proxyParsed.length);
        partition.fill({});

        var partitionObjZero = {};
        partitionObjZero.start = 0;
        partitionObjZero.end = rem + div;
        partitionObjZero.proxy_parc = proxyParsed[0];
        partition[0] = partitionObjZero;
        console.log(partition[0]);
        for (var i = 1; i < proxyParsed.length; i++) {
          var partitionObjI = {};
          partitionObjI.start = partition[i-1].end;
          partitionObjI.end = partition[i-1].end + div;
          partitionObjI.proxy_parc = proxyParsed[i];
          partition[i] = partitionObjI;
          console.log(partition[i]);
        }
        console.log(partition);
        task.partitions = partition;
      } else {
        var partition = [];
        var partitionObj = {};
        partitionObj.start = 0;
        partitionObj.end = parsed_array.length;
        partitionObj.proxy_parc = "";
        partition[0] = partitionObj;
        console.log(partition);
        task.partitions = partition;
      }
      
      ipc.send('add_task_event', task);
      window.close();
    });
  });
}

function filtration(taskName) {
  if ($("div.container").data('user')) {
    filtrationUser(taskName);
  } else {
    filtrationTask(taskName);
  } 
}

function parseConcurrents(taskName) {

  var tasks = [];
  var users = $("div.container").data('user');

  users.forEach(function(user, iter, arr) {
    var task = {};
    task.name = taskName;
    task.outputfile = document.getElementById("parsed_accounts").value;
    task.max_limit = document.getElementById("max_limit").value;
    var followTrueSubscribeFalse = false;
    if (document.getElementById("follow").checked == true) {
      followTrueSubscribeFalse = true;
    }
    task.parse_type = followTrueSubscribeFalse;

    var concurParsed = document.getElementById("parsed_conc").value.split('\n');
    concurParsed = concurParsed.filter(isEmpty);
    var to_parse_usernames = concurParsed.length;
    var div = Math.floor(to_parse_usernames / users.length);
    var rem = to_parse_usernames % users.length;
    var dotation = [];
    dotation[0] = rem + div;
    for (var i = 1; i < users.length; i++) {
      dotation[i] = dotation[i-1]+div;
    }
    task.parsed_conc = (iter == 0) ? concurParsed.slice(0, dotation[iter]) : concurParsed.slice(dotation[iter-1], dotation[iter]);
    tasks.push(task);
    if(iter == arr.length - 1) {      
      ipc.send('add_task_event', tasks, users);
      window.close();
    }
  });
}


function createAccounts(taskName) {

  var task = {};
  var domContainer = $("div.container").data('task');
  if (domContainer) {
    task._id = domContainer._id;
    task._rev = domContainer._rev;
  } else {
    task._id = new Date().toISOString();
  }
  
  task.status = '-';
  task.name = taskName;
  task.type = 'task';
  task.email_parsed = '';
  task.own_emails = document.getElementById("own_emails").checked;
  if(document.getElementById("own_emails").checked == true) {
    task.email_parsed = document.getElementById("parsed_own_emails").value.split('\n').filter(isEmpty);
  } else {
    task.emails_cnt = document.getElementById("reg_count").value;
  }
  task.reg_timeout = document.getElementById("reg_timeout").value;
  task.proxy_file = document.getElementById("proxy_file").value;
  task.output_file = document.getElementById("output_file").value;

  ipc.send('add_task_event', task);
  window.close();
}

function completeTask(taskName) {
  if (taskName == 'parse_concurrents') {
    parseConcurrents(taskName);
  } else if (taskName == 'filtration') {
    filtration(taskName);
  } else if (taskName == 'create_accounts') {
    createAccounts(taskName);
  }
}

