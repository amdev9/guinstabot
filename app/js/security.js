//////////////////////////////
//// SECURITY CHECK //////////
//////////////////////////////

var http = require('http');
var Registry = require('winreg');
var Promise = require("bluebird");

function check(cb) {
  var str = "\u6f22\u5b57"; // "\u6f22\u5b57" === "漢字"
  console.log(str.hexEncode().hexDecode());
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

  var data = JSON.stringify({
    "hex": "test5",
    "approved": "false"
  });

  callback = function(response) {
    var str = ''
    response.on('data', function (chunk) {
      str += chunk;
    });
    response.on('end', function () {  
      var resp = JSON.parse(str);
      console.log(resp);
      if (resp.status == 'ok') {
        if (resp.message == "hash here") {
          cb("success");
        } else {
          cb("failure");
        }
      }
    });
  }

  winreestr().then(function (res) {
    console.log(res);
    // if (res) {
    //   var req = http.request(options, callback);
    //   req.write(data);
    //   req.end();
    // }
  });

}

//////////////////////////////
//// WINDOWS APP SECURITY ////
//////////////////////////////

function winreestr() {
  var resultHex = '';
  function getDeviceParams() {
    return new Promise(function(resolve) {
      resolve(os.totalmem() +''+ os.userInfo().username, os.userInfo().homedir);
    });
  }
  return getDeviceParams()
  .then(function(resHex) {
     
    // DiskVirtual для VirtualPC DiskVBOX_HARDDISK для Virtual Box Prod_VMware_Virtual для VMware Workstation
    regKeyDisk = new Registry({                                       
      hive: Registry.HKLM,                                       
      key: '\\SYSTEM\\CurrentControlSet\\services\\Disk\\Enum'
    })
    regKeyDisk.values(function (err, items ) {
    if (err)
      console.log('ERROR: '+err);
    else
      for (var i=0; i<items.length; i++) {
        if (items[i].name == '0') {
          console.log ( resHex + ' ITEM: '+items[i].name+' '+items[i].type+' '+items[i].value );
        }
      }
    }); 

    
  });




  // // 2)
  // console.log("2) -------------------<");
  // // key: '\\HARDWARE\\DESCRIPTION\\System\\BIOS'
  // // BaseBoardManufacturer  BaseBoardProduct  BIOSVendor  BIOSReleaseDate 
  // regKeyBIOS = new Registry({                                       
  //   hive: Registry.HKLM,                                       
  //   key: '\\HARDWARE\\DESCRIPTION\\System\\BIOS'
  // })
  // regKeyBIOS.values(function (err, items ) {
  // if (err)
  //   console.log('ERROR: '+err);
  // else
  //   for (var i=0; i<items.length; i++) {
  //     if (items[i].name == 'BaseBoardManufacturer' || items[i].name == 'BIOSVendor' || items[i].name == 'SystemManufacturer' ) {

  //       console.log('ITEM: '+items[i].name+'\t'+items[i].type+'\t'+items[i].value);
  //     }
  //   }
  // }); 

  // // 3)
  // var exec = require('child_process').exec;
  // var vm_task_arr = [ 'VirtualBox',
  //                     'VBoxTray.exe',
  //                     'VBoxService.exe',
  //                     'Parallels',
  //                     'Workstation',
  //                     'prl_cc.exe',
  //                     'prl_tools.exe',
  //                     'SharedIntApp.exe',
  //                     'Virtual',
  //                     'PC',
  //                     'vmusrvc.exe',
  //                     'vmsrvc.exe',
  //                     'VMware',
  //                     'Workstation',
  //                     'vmtoolsd.exe' ];
  // exec('tasklist', function(err, stdout, stderr) {
  //   vm_task_arr.forEach( function (item) {
  //     if (stdout.indexOf(item) > 0) {
        
  //       console.log(item);
  //     }
  //   });
  // });
  
  // // 4)
  // for(var key in os.networkInterfaces()) {
  //   var vm_mac_arr = ['00:05:69', '00:0c:29', '00:1c:14', '00:50:56',   // VMware (VMware Workstation)
  //                     '00:03:ff', '00:0d:3a', '00:50:f2', '7c:1e:52', 
  //                     '00:12:5a', '00:15:5d', 
  //                     '00:17:fa', '28:18:78', '7c:ed:8d', '00:1d:d8', 
  //                     '00:22:48', '00:25:ae', '60:45:bd', 'Dc:b4:c4',   // Microsoft (Virtual PC) 
  //                                                         '08:00:20',   // Oracle (VirtualBox) 
  //                                                         '00:1c:42'];  // Parallels (Parallels Workstation)
  //   if(vm_mac_arr.indexOf(os.networkInterfaces()[key][0].mac.substring(0,8) ) > 0 ) {
      
  //     console.log(os.networkInterfaces()[key][0].mac);
  //   }
  // }

  // // 5)
  // var vm_open = ['VBoxTrayToolWndClass', 'CPInterceptor',  'DesktopUtilites', 'VMSwitchUserControlClass', 'prl.tools.auxwnd', '0843FD01-1D28-44a3-B11D-E3A93A85EA96'];
  // var ref = require('ref');
  // var ffi = require('ffi');
  // var voidPtr = ref.refType(ref.types.void);
  // var stringPtr = ref.refType(ref.types.CString);
  // var user32 = ffi.Library('user32.dll', {
  //     EnumWindows: ['bool', [voidPtr, 'int32']],
  //     GetWindowTextA : ['long', ['long', stringPtr, 'long']]
  // });
  // windowProc = ffi.Callback('bool', ['long', 'int32'], function(hwnd, lParam) {
  //   var buf, name, ret;
  //   buf = new Buffer(255);
  //   ret = user32.GetWindowTextA(hwnd, buf, 255);
  //   name = ref.readCString(buf, 0);
  //   if (vm_open.indexOf(name) > 0) {
  //     console.log(name);
  //   }
  //   return true;
  // });
  // user32.EnumWindows(windowProc, 0);

}

String.prototype.hexEncode = function(){
  var hex, i;
  var result = "";
  for (i=0; i<this.length; i++) {
      hex = this.charCodeAt(i).toString(16);
      result += ("000"+hex).slice(-4);
  }
  return result
}

String.prototype.hexDecode = function(){
  var j;
  var hexes = this.match(/.{1,4}/g) || [];
  var back = "";
  for(j = 0; j<hexes.length; j++) {
      back += String.fromCharCode(parseInt(hexes[j], 16));
  }
  return back;
}

