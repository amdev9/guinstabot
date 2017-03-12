
 
function setBgPosition() {
  var c = 0, timer = 0;
  function run(res) {
    console.log(res)
    res++;
    if (res < 4)
      timer = setTimeout(run, 1000, res);
  }
  timer = setTimeout(run, 1000, 0);

  return stop;

  function stop() {
    if (timer) {
      clearTimeout(timer);
      timer = 0;
    }
  }
}


var stop = setBgPosition();
// stop();




    
// var promiseWhile = function(action) {
//   return new Promise(function(resolve, reject) { 
//     var indicator = 0;

//     var func = function(results) { 
//       if (results) {
//         indicator++;
//         console.log(results)
//       }
//       if (indicator == 4) {  
//         return reject(new Error("stop"));  
//       }
//       return Promise.resolve(action())
//         .then(func)
//         .catch(function(err) {
//           reject(err)
//         }) 
//     }

//     process.nextTick(func)
//   }) 
// }

// promiseWhile(function() {
//   return new Promise(function(resolve, reject) {
//     setTimeout(function() {
//       resolve(6); 
//     }, 2000);
//   });
// })
// .catch(function (err) {

//   console.log(err);
   
// });

