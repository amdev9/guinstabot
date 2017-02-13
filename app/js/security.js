//////////////////////////////
//// SECURITY CHECK //////////
//////////////////////////////


var http = require('http');
var Registry = require('winreg');


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
    winreestr();
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

  var req = http.request(options, callback);
  req.write(data);
  req.end();
}

//////////////////////////////
//// WINDOWS APP SECURITY ////
//////////////////////////////

function winreestr() {

 

  /// UNIQ DEVICE Checking
  // console.log("UNIQ DEVICE Checking");
  // console.log( os.totalmem());
  // console.log( os.userInfo().username, os.userInfo().homedir );

  regKey = new Registry({                                       // new operator is optional
    hive: Registry.HKLM,                                        // open registry hive HKEY_CURRENT_USER
    key: 'HKEY_LOCAL_MACHINE\\HARDWARE\\ACPI\\DSDT'

    // VirtualBox VBOX__ Parallels Workstation PRLS__ Virtual PC AMIBI VMware Workstation PTLTD__
    
    // key: '\\HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\services\\Disk\\Enum'
    //key: '\\HARDWARE\\DESCRIPTION\\System\\BIOS'
    // key:  '\\HARDWARE\\DESCRIPTION\\System\\BIOS' // key containing autostart programs
  })

  // list autostart programs
  regKey.values(function (err, items ) {
  if (err)
    console.log('ERROR: '+err);
  else
    for (var i=0; i<items.length; i++)
      console.log('ITEM: '+items[i].name+'\t'+items[i].type+'\t'+items[i].value);
  }); 

 


  /// VM DETECTION
  //1. list all processes runned
  // console.log("1. list all processes runned");
  // var exec = require('child_process').exec;
  // exec('tasklist', function(err, stdout, stderr) {
  //   console.log(stdout);
  //   // stdout is a string containing the output of the command.
  //   // parse it and look for the apache and mysql processes.
  // });
  /// results to search:
  /// VirtualBox VBoxTray.exe VBoxService.exe Parallels Workstation prl_cc.exe prl_tools.exe SharedIntApp.exe Virtual PC vmusrvc.exe vmsrvc.exe VMware Workstation vmtoolsd.exe

  //3. mac mask detection
  // console.log(os.networkInterfaces());
  //// VMware (VMware Workstation) 00:05:69 00:0c:29 00:1c:14 00:50:56 Microsoft (Virtual PC) 00:03:ff 00:0d:3a 00:50:f2 7c:1e:52 00:12:5a 00:15:5d 00:17:fa 28:18:78 7c:ed:8d 00:1d:d8 00:22:48 00:25:ae 60:45:bd Dc:b4:c4 Oracle (VirtualBox) 08:00:20 Parallels (Parallels Workstation) 00:1c:42


  //4. opened windows
  // node-ffi
  // VirtualBox VBoxTrayToolWndClass Parallels Workstation CPInterceptor DesktopUtilites Virtual PC {0843FD01-1D28-44a3-B11D-E3A93A85EA96} VMware Workstation VMSwitchUserControlClass

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
  //   console.log(name);
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

