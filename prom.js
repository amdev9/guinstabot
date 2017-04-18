
var async =  require('async')
var fs = require('fs')
var Promise =  require('bluebird')
var ind = 0;

// async.mapValues({
//     f1: 'file1',
//     f2: 'file2',
//     f3: 'file3'
// }, function (file, key, callback) {
//   fs.stat(file, callback);
// }, function(err, result) {
//   console.log(result)
//     // result is now a map of stats for each file, e.g.
//     // {
//     //     f1: [stats for file1],
//     //     f2: [stats for file2],
//     //     f3: [stats for file3]
//     // }
// });



// assuming openFiles is an array of file names
async.each([1,2,3,4], function(file, callback) {

    // Perform operation on file here.
    console.log('Processing file ' + file);

    if( file.length > 32 ) {
      console.log('This file name is too long');
      callback('File name too long');
    } else {
      // Do work to process file here
      console.log('File processed');
      callback();
    }
}, function(err) {
    // if any of the file processing produced an error, err would equal that error
    if( err ) {
      // One of the iterations produced an error.
      // All processing will now stop.
      console.log('A file failed to process');
    } else {
      console.log('All files have been processed successfully');
    }
});


var promiseFor = Promise.method(function(condition, action, value) {
  if (!condition(value))
    return value;
  return action(value)
    .then(promiseFor.bind(null, condition, action));
});

var condFunc = function(count) {
  return count < 10;
}

var actionFunc = function(count) {
  return getUser()
  .then(function(res) { 
    console.log(res); 
    return ++count;
  });
};

promiseFor(condFunc, actionFunc, 0)
  .then(console.log.bind(console, ' all done '));

var promiseWhile = Promise.method(function(condition, action) {
    if (!condition()) return;
    return action().then(promiseWhile.bind(null, condition, action));
});

var condFunc = function() {
  return ind < 10;
}

var actionFunc = function() {
  return getUser()
  .then(function(res) { 
    console.log(res); 
    // return ++count;
  });
};


// promiseWhile(condFunc, actionFunc)
//   .then(console.log.bind(console, ' all done '));


// function getUser() {

//   return new Promise(function(resolve, reject) {
//     setTimeout(function() {
//       var r = ind++ + ' test'
//       resolve(r);
//     }, 1000)
//   })
// }







// // http://stackoverflow.com/questions/24660096/correct-way-to-write-loops-for-promise

// var iterator = 0;
// var promiseWhile = function( action) {
//         console.log('promiseWhile', iterator)
//   return new Promise(function(resolve, reject) {
//     var func = function(json) {
       
//       // console.log(action.toString())
//       console.log(json)
//       // if ( iterator >= taskpart.end ) {   // getStateView(task._id) == 'stop' || getStateView(task._id) == 'stopped' || 
//       //   return reject(new Error("stop"));
//       // } 
//       return Promise.resolve(action())
//       .then(func)
//       .catch(function() {
//         reject()
//       });
//     }
//     process.nextTick(func);
//   });
// }

// promiseWhile(function() {
//   return new Promise(function(resolve, reject) {
//     setTimeout(function() {
//       console.log('setTimeout', iterator)
//       resolve(iterator + ' hui'); // FIX pass param 
//       iterator++;
//     }, 1000)
//   });
// }).then(function() {
//   callback();
// }).catch(function (err) {
//   console.log(err);
//   callback();
// })
