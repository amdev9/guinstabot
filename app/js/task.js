ipc = require('electron').ipcRenderer;
var _ = require('lodash')
var turf = require('@turf/turf')
var mapboxgl = require('mapbox-gl');
var MapboxDraw = require('@mapbox/mapbox-gl-draw');

var Point = require('point-geometry')
var fs = require("fs");
var Promise = require('bluebird');
var readFilePromise = Promise.promisify(require("fs").readFile);
const {dialog} = require('electron').remote
var config = require('../config/default');
var softname = config.App.softname;

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
    } else if (task.name == 'create_accounts') {
      editCreateAccounts(task);
    } else if (task.name == 'parse_geo') {
      editParseGeo(task);
    }
  }
});

function updateElementsAccessibility(type) {
  if (type == 'user') {
    updateElemView(['parse_concurrents', 'filtration']);
  } else {
    updateElemView(['parse_geo', 'filtration', 'create_accounts']);
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

 
function checkDisabler() {
  if (document.getElementById('own_emails').checked == true) {
    document.getElementById("parsed_own_emails").disabled = false;
    document.getElementById("clean_own_emails").disabled = false;
    document.getElementById("open_own_emails").disabled = false;
    document.getElementById("reg_count").disabled = true;
  } else {
    document.getElementById("open_own_emails").disabled = true;
    document.getElementById("parsed_own_emails").disabled = true;
    document.getElementById("clean_own_emails").disabled = true;
    document.getElementById("reg_count").disabled = false;
  }
}

function editCreateAccounts(task) {
  $("div.container").data('task', { _id: task._id, _rev: task._rev });
  updateElemView(['create_accounts']);
  document.getElementById("own_emails").checked = task.own_emails;
  document.getElementById("reg_timeout").value = task.reg_timeout;
  document.getElementById("proxy_create").value = task.proxy_file;
  document.getElementById("output_file").value = task.output_file;
  if (document.getElementById("own_emails").checked) {
    document.getElementById("parsed_own_emails").value = task.email_parsed.join('\n');
  } else {
    document.getElementById("reg_count").value = task.emails_cnt;
  }
  checkDisabler();
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
  task.proxy_file = document.getElementById("proxy_create").value;
  task.output_file = document.getElementById("output_file").value;

  ipc.send('add_task_event', task);
  window.close();
}

function editParseGeo(task) {
  map.on('load', function() {
    draw.add(task.draw_data);
    map.setCenter(task.centroid);
  });
  $("div.container").data('task', { _id: task._id, _rev: task._rev });
  updateElemView(['parse_geo']);
  document.getElementById("proxy_geo").value = task.proxy_file;
  document.getElementById("geo_max_limit").value = task.max_limit;
  document.getElementById("geo_avatar").checked = task.anonym_profile; 
  document.getElementById("geo_accounts").value = task.output_file;
  checkDisabler(); 
}

function parseGeo(taskName) {
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
  var data = draw.getAll()
  if (data.features.length > 0) {
    task.draw_data = data;
    var coordinates = data.features[0].geometry.coordinates[0]
    task.centroid = getCentroid2(coordinates)
    task.distance = calcDistance(task.centroid, coordinates)
    task.proxy_file = document.getElementById("proxy_geo").value;
    task.max_limit = document.getElementById("geo_max_limit").value;
    task.anonym_profile = document.getElementById("geo_avatar").checked;
    task.output_file = document.getElementById("geo_accounts").value;
    ipc.send('add_task_event', task);
    window.close();
  } else {
    console.log('nooooooo')
  }
}

function completeTask(taskName) {
  if (taskName == 'parse_concurrents') {
    parseConcurrents(taskName);
  } else if (taskName == 'filtration') {
    filtration(taskName);
  } else if (taskName == 'create_accounts') {
    createAccounts(taskName);
  } else if (taskName == 'parse_geo') {
    parseGeo(taskName);
  }
}

mapboxgl.accessToken = 'pk.eyJ1Ijoic29jaWFsZGV2IiwiYSI6ImNqMHp4cDJ5bDAwMnozM21xaXhzaXlta3EifQ.LS_wz5TRUumqdIKkBjAhLg'; //
 
$(".js-data-example-ajax").select2({
  ajax: {
    url: function(query) {
      // console.log(query.term);
      return "https://api.mapbox.com/geocoding/v5/mapbox.places/" + query + ".json"
    },
    dataType: 'json',
    delay: 250,
    data: function (query) {
      console.log(query);
      // if (!query.term) query.term = 'Москва';
      return {
        access_token: mapboxgl.accessToken
      };
    },
    results: function (data) {
      console.log(data);
      var parsed = [];
      try {
        parsed = _.chain(data.features)
          .map(function (item, index) {
            return {
              id: index,
              text: item.text,
              center: item.center
            };
          })
          .value();
        console.log(parsed);
      } catch (e) {}
      return {
        results: parsed
      };
    },
    cache: true
  },
  minimumInputLength: 1
});


$('.js-data-example-ajax').on('select2-selecting', function (evt) {
  map.setCenter(evt.choice.center); 
});

document.title = "Добавление задания | " + softname
document.getElementById("own_emails").addEventListener("click",function(){
  checkDisabler();
}, false)
checkDisabler();

/* eslint-disable */
var map = new mapboxgl.Map({
  container: 'map', // container id
  style: 'mapbox://styles/mapbox/basic-v9', //hosted style id
  center: [-91.874, 42.760], // starting position
  zoom: 7 // starting zoom
});

// map.addControl(new MapboxGeocoder({
//   accessToken: mapboxgl.accessToken
// }));

// map.setLayoutProperty('country-label-lg', 'text-field', '{name_ru}');

var draw = new MapboxDraw({
  displayControlsDefault: false,
  controls: {
    polygon: true,
    trash: true
  }
});

var nav = new mapboxgl.NavigationControl();

map.addControl(nav, 'top-left');
map.addControl(draw, 'top-left');

function getCentroid2 (arr) {
  var twoTimesSignedArea = 0;
  var cxTimes6SignedArea = 0;
  var cyTimes6SignedArea = 0;

  var length = arr.length

  var x = function (i) { return arr[i % length][0] };
  var y = function (i) { return arr[i % length][1] };

  for (var i = 0; i < arr.length; i++) {
    var twoSA = x(i)*y(i+1) - x(i+1)*y(i);
    twoTimesSignedArea += twoSA;
    cxTimes6SignedArea += (x(i) + x(i+1)) * twoSA;
    cyTimes6SignedArea += (y(i) + y(i+1)) * twoSA;
  }
  var sixSignedArea = 3 * twoTimesSignedArea;
  return [ cxTimes6SignedArea / sixSignedArea, cyTimes6SignedArea / sixSignedArea];        
}

function calcDistance(centroid, coordinates) {
  var maxDist = 0;
  var maxIndex = 0;
  var length = coordinates.length
  var x = function (i) { return coordinates[i % length][0] };
  var y = function (i) { return coordinates[i % length][1] };

  var pointOne = new Point(centroid[0], centroid[1]);
  for (var i = 0; i < coordinates.length; i++) {
    var pointTwo = new Point(x(i), y(i));
    var dist = pointOne.dist(pointTwo);

    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }
  var linestring = {
    "type": "Feature",
    "geometry": {
      "type": "LineString",
      "coordinates": [
        centroid,
        coordinates[maxIndex]
      ]
    }
  };
  return turf.lineDistance(linestring) // kilometers
}





