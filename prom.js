
var Promise =  require('bluebird')
var ind = 0;

// var promiseFor = Promise.method(function(condition, action, value) {
//   if (!condition(value))
//     return value;
//   return action(value)
//     .then(promiseFor.bind(null, condition, action));
// });

// var condFunc = function(count) {
//   return count < 10;
// }

// var actionFunc = function(count) {
//   return getUser()
//   .then(function(res) { 
//     console.log(res); 
//     return ++count;
//   });
// };

// promiseFor(condFunc, actionFunc, 0)
//   .then(console.log.bind(console, ' all done '));

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


promiseWhile(condFunc, actionFunc)
  .then(console.log.bind(console, ' all done '));


function getUser() {

  return new Promise(function(resolve, reject) {
    setTimeout(function() {
      var r = ind++ + ' test'
      resolve(r);
    }, 1000)
  })
}







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
