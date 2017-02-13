//////////////////////////////
//// SECURITY CHECK //////////
//////////////////////////////

var http = require('http');

function check(cb) {

  var options = {
    host: '127.0.0.1',
    path: '/api/uploader',
    port: '5014',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };


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

      if (process.platform == 'darwin') {
        console.log(resp);
      }
      
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

/*

/// HEX STRING 
/// http://stackoverflow.com/questions/21647928/javascript-unicode-string-to-hex



/// UNIQ DEVICE Checking
/// 1) os.totalmem()
/// 2) os.userInfo().username, os.userInfo().homedir

/// VM DETECTION
//1. list all processes runned

var exec = require('child_process').exec;
exec('tasklist', function(err, stdout, stderr) {
  console.log(stdout);
  // stdout is a string containing the output of the command.
  // parse it and look for the apache and mysql processes.
});

/// results to search:
/// VirtualBox VBoxTray.exe VBoxService.exe Parallels Workstation prl_cc.exe prl_tools.exe SharedIntApp.exe Virtual PC vmusrvc.exe vmsrvc.exe VMware Workstation vmtoolsd.exe

//2.
// HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\services\Disk\Enum --> 0
// \\HARDWARE\\DESCRIPTION\\System\\BIOS

//2a. HKEY_LOCAL_MACHINE\HARDWARE\ACPI\DSDT
// VirtualBox VBOX__ Parallels Workstation PRLS__ Virtual PC AMIBI VMware Workstation PTLTD__

//3. mac mask detection
//// os.networkInterfaces()
//// VMware (VMware Workstation) 00:05:69 00:0c:29 00:1c:14 00:50:56 Microsoft (Virtual PC) 00:03:ff 00:0d:3a 00:50:f2 7c:1e:52 00:12:5a 00:15:5d 00:17:fa 28:18:78 7c:ed:8d 00:1d:d8 00:22:48 00:25:ae 60:45:bd Dc:b4:c4 Oracle (VirtualBox) 08:00:20 Parallels (Parallels Workstation) 00:1c:42


//4. opened windows
// node-ffi
// VirtualBox VBoxTrayToolWndClass Parallels Workstation CPInterceptor DesktopUtilites Virtual PC {0843FD01-1D28-44a3-B11D-E3A93A85EA96} VMware Workstation VMSwitchUserControlClass

 
var Registry = require('winreg')
,   regKey = new Registry({                                       // new operator is optional
      hive: Registry.HKLM,                                        // open registry hive HKEY_CURRENT_USER
      key:  '\\HARDWARE\\DESCRIPTION\\System\\BIOS' // key containing autostart programs
    })

 
// list autostart programs
 regKey.values(function (err, items ) {
  if (err)
    console.log('ERROR: '+err);
  else
    for (var i=0; i<items.length; i++)
      console.log('ITEM: '+items[i].name+'\t'+items[i].type+'\t'+items[i].value);
}); 


 
var regedit = require('regedit')
 
regedit.list('HKLM\\HARDWARE', function(err, result) {
    console.log(result);
})
*/

