/////////////////////////////////////
////////////// HELPERS //////////////
/////////////////////////////////////

'use strict';

function checkFolderExists(filepath) {
  if (!fs.existsSync(filepath)){
    fs.mkdirSync(filepath);
  }
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
