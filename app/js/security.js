//////////////////////////////
//// SECURITY CHECK //////////
//////////////////////////////

var http = require('http');
var Registry = require('winreg');
var Promise = require('bluebird');
const crypto = require('crypto');
// var _ = require('lodash');

String.prototype.hexEncode = function(){
  var hex, i;
  var result = "";
  for (i = 0; i < this.length; i++) {
      hex = this.charCodeAt(i).toString(16);
      result += ("000"+hex).slice(-4);
  }
  return result
}

function checkLicense(cb) {
  if (process.platform == 'darwin') {
    var options = {
      host: '127.0.0.1',
      path: '/api/uploader',
      port: '5014',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
  } else {
    var options = {
      host: '192.168.1.33',
      path: '/api/uploader',
      port: '5014',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
  }

  callback = function(response) {
    var str = ''
    response.on('data', function (chunk) {
      str += chunk;
    });
    response.on('end', function () {  
      var resp = JSON.parse(str);
      console.log(resp);
      if (resp.status == 'ok') {
        // sha-1 for checking and comparing
        var hash = sha1(finalStringArr.join("|"));
        if (resp.message == hash) {
          cb("ok");
        } else {
          cb("fail");
        }
      }
    });
  }

  var finalStringArr = [];
  var finalErr = [];
  winReestr(function(key, value) {
    switch (key) {
      case 'memUserDir': 
        finalStringArr[0] = value;
        break;
      case 'BIOSVersion': 
        finalStringArr[1] = value;
        break;
      case 'DiskEnum': 
        finalStringArr[2] = value;
        break;
      case 'BIOSVendor': 
        finalStringArr[3] = value;
        break;
      case 'SystemManufacturer':
        finalStringArr[4] = value;
        break;
      case 'BaseBoardManufacturer':
        finalStringArr[5] = value;
        break;
    }
  }, function(errValue) {
    finalErr.push(errValue);
  }).then(function() {
    console.log(finalStringArr);
    var res = '';
    finalStringArr.forEach(function(item) {
      res = res + item.hexEncode() + "|";
    });
    console.log(res);
    

    // if (finalErr.length == 0) {
      // sha256 for hashing license key
      // serialKey identificator && id uploader for db


      // var serialKey = finalStringArr.slice(0,2).join("|");
      // const secretSerial = 'abcdefg';
      // const secretMessage = 'a password';
      // var token = sha256(serialKey, secretSerial);
      // showLicenseTokenView(token);
      // // aes 192 to send data to server
      // var sendData = '';
      // var message = aes192Cipher(sendData, secretMessage);
      // var postData = JSON.stringify({
      //   "token": token,
      //   "message": message
      // });

      // var req = http.request(options, callback);
      // console.log(postData);
      // req.write(postData);
      // req.end();


    // } else {
    //   showLicenseTokenView();
    //   cb("vm");
    // }
  });
}

//////////////////////////////
//// WINDOWS APP SECURITY ////
//////////////////////////////

function diskEnum(cb) {
  regKeyDisk = new Registry({                                       
    hive: Registry.HKLM,                                       
    key: '\\SYSTEM\\CurrentControlSet\\services\\Disk\\Enum'
  })
  regKeyDisk.values(function (err, items ) {
  if (err)
    console.log('ERROR: ' + err);
  else
    for (var i = 0; i < items.length; i++) {
      if (items[i].name == '0') { 
        cb('DiskEnum', items[i].value);
      }
    }
  });
}

function bios(cb) {
  regKeyBIOS = new Registry({                                       
    hive: Registry.HKLM,                                       
    key: '\\HARDWARE\\DESCRIPTION\\System\\BIOS'
  })
  regKeyBIOS.values(function (err, items ) {
  if (err)
    console.log('ERROR: ' + err);
  else
    for (var i = 0; i < items.length; i ++) {
      if (items[i].name == 'BaseBoardManufacturer' || items[i].name == 'BIOSVendor' || items[i].name == 'SystemManufacturer' || items[i].name == 'BIOSVersion') {
        cb(items[i].name , items[i].value);
      }
    }
  }); 
}

function taskList(erback) {
  var exec = require('child_process').exec;
  var vm_task_arr = [ 'VirtualBox',
                      'VBoxTray.exe',
                      'VBoxService.exe',
                      'Parallels',
                      'Workstation',
                      'prl_cc.exe',
                      'prl_tools.exe',
                      'SharedIntApp.exe',
                      'Virtual',
                      'PC',
                      'vmusrvc.exe',
                      'vmsrvc.exe',
                      'VMware',
                      'Workstation',
                      'vmtoolsd.exe' ];
  exec('tasklist', function(err, stdout, stderr) {
    vm_task_arr.forEach( function (item) {
      if (stdout.indexOf(item) > 0) {
        erback(item);
      }
    });
  });
}

function networkInt(erback) {
  for(var key in os.networkInterfaces()) {
    var vm_mac_arr = ['00:05:69', '00:0c:29', '00:1c:14', '00:50:56',   // VMware (VMware Workstation)
                      '00:03:ff', '00:0d:3a', '00:50:f2', '7c:1e:52', '00:12:5a', '00:15:5d', '00:17:fa', '28:18:78', '7c:ed:8d', '00:1d:d8', 
                      '00:22:48', '00:25:ae', '60:45:bd', 'Dc:b4:c4',   // Microsoft (Virtual PC) 
                                                          '08:00:20',   // Oracle (VirtualBox) 
                                                          '00:1c:42'];  // Parallels (Parallels Workstation)
    if(vm_mac_arr.indexOf(os.networkInterfaces()[key][0].mac.substring(0,8) ) > 0 ) {
      erback(os.networkInterfaces()[key][0].mac);
    }
  }
}

function openWin(erback) {
  var vm_open = ['VBoxTrayToolWndClass', 'CPInterceptor',  'DesktopUtilites', 'VMSwitchUserControlClass', 'prl.tools.auxwnd', '0843FD01-1D28-44a3-B11D-E3A93A85EA96'];
  var ref = require('ref');
  var ffi = require('ffi');
  var voidPtr = ref.refType(ref.types.void);
  var stringPtr = ref.refType(ref.types.CString);
  var user32 = ffi.Library('user32.dll', {
      EnumWindows: ['bool', [voidPtr, 'int32']],
      GetWindowTextA : ['long', ['long', stringPtr, 'long']]
  });
  windowProc = ffi.Callback('bool', ['long', 'int32'], function(hwnd, lParam) {
    var buf, name, ret;
    buf = new Buffer(255);
    ret = user32.GetWindowTextA(hwnd, buf, 255);
    name = ref.readCString(buf, 0);
    if (vm_open.indexOf(name) > 0) {
      erback(name);
    }
    return true;
  });
  user32.EnumWindows(windowProc, 0);
}

function winReestr(cb, erback) {
  function getDeviceParams() {
    return new Promise(function(resolve) {
      resolve(os.totalmem() + '|' + os.userInfo().username + "|" + os.userInfo().homedir);
    });
  }
  return getDeviceParams()
  .then(function(resHex) {
    cb('memUserDir', resHex);
    diskEnum(cb);
    bios(cb);
    taskList(erback);
    networkInt(erback);
    openWin(erback);
  });
}

//  var str = "\u6f22\u5b57"; // "\u6f22\u5b57" === "漢字"
// console.log(str.hexEncode().hexDecode());

String.prototype.hexDecode = function(){
  var j;
  var hexes = this.match(/.{1,4}/g) || [];
  var back = "";
  for(j = 0; j < hexes.length; j++) {
      back += String.fromCharCode(parseInt(hexes[j], 16));
  }
  return back;
}

function sha256(serialKey, secret) {
  const hash = crypto.createHmac('sha256', secret)
                     .update(serialKey)
                     .digest('hex');
  return hash;
}

function aes192Cipher(finalString, secret) {
  const cipher = crypto.createCipher('aes192', secret);
  let encrypted = cipher.update(finalString, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function sha1(toHashString) {
  shasum = crypto.createHash('sha1');
  shasum.update(toHashString);
  return shasum.digest('hex');
}

