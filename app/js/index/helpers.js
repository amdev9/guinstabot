/////////////////////////////////////
////////////// HELPERS //////////////
/////////////////////////////////////

'use strict';

var fs = require('fs');
var mkdirp = require('mkdirp');

function setProxyFunc(proxyString) {
  if(proxyString.split(":").length == 2) {
    let proxy_ip = proxyString.split(":")[0];
    let proxy_port = proxyString.split(":")[1];
    console.log(`http://${proxy_ip}:${proxy_port}`); 
    Client.Request.setProxy(`http://${proxy_ip}:${proxy_port}`); 
  } else if(proxyString.split(":").length == 4) {
    let proxy_name = proxyString.split(":")[0];
    let proxy_pass = proxyString.split(":")[1];
    let proxy_ip = proxyString.split(":")[2];
    let proxy_port = proxyString.split(":")[3];
    console.log(`http://${proxy_name}:${proxy_pass}@${proxy_ip}:${proxy_port}`);
    Client.Request.setProxy(`http://${proxy_name}:${proxy_pass}@${proxy_ip}:${proxy_port}`);
  } else {
    console.log("Proxy format wrong");
  }
}

function checkFolderExists(filepath) {
  mkdirp(filepath, function (err) {
    if (err) console.error(err)
    else console.log('pow!')
  });
}

function appendStringFile(filepath, string) {
  fs.appendFile(filepath, string + '\n', (err) => {
    if (err) throw err;
    // console.log('appended to file');
  });
}

function createFile(filename) {
  fs.open(filename,'r', function(err, fd) {
    if (err) {
      fs.writeFile(filename, '', function(err) {
        if(err) {
          console.log(err);
        }
        // console.log("The file was saved!");
      });
    } else {
      // console.log("The file exists!");
    }
  });
}

function isEmpty(x) {
  if( x !== "" ) {
    return true;
  }
}

function getTimeStamp() {
  var d = new Date();
  var timeTxt = d.toTimeString().split(' ')[0];
  var dateTxt = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  var dateTimeTxt = "[" + dateTxt+" "+timeTxt + "] ";
  return dateTimeTxt;
}

function convertTime(UNIX_timestamp) {
  var a = new Date(UNIX_timestamp);
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var year = a.getFullYear();
  var month = months[a.getMonth()];
  var date = a.getDate();
  var hour = a.getHours();
  var min = a.getMinutes();
  var sec = a.getSeconds();
  var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec ;
  return time;
}