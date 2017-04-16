

// http://stackoverflow.com/questions/24660096/correct-way-to-write-loops-for-promise

var iterator = 0;
var promiseWhile = function( action) {
        console.log('promiseWhile', iterator)
  return new Promise(function(resolve, reject) {
    var func = function(json) {
       
      // console.log(action.toString())
      console.log(json)
      // if ( iterator >= taskpart.end ) {   // getStateView(task._id) == 'stop' || getStateView(task._id) == 'stopped' || 
      //   return reject(new Error("stop"));
      // } 
      return Promise.resolve(action())
      .then(func)
      .catch(function() {
        reject()
      });
    }
    process.nextTick(func);
  });
}

promiseWhile(function() {
  return new Promise(function(resolve, reject) {
    setTimeout(function() {
      console.log('setTimeout', iterator)
      resolve(iterator + ' hui'); // FIX pass param 
      iterator++;
    }, 1000)
  });
}).then(function() {
  callback();
}).catch(function (err) {
  console.log(err);
  callback();
})
