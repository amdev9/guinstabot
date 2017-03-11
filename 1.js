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


// var timerId = setTimeout(function() { console.log('Привет') }, 1000);
// clearTimeout(timerId);

function setBgPosition() {
    var c = 0,
        timer = 0;
    var numbers = [0, -120, -240, -360, -480, -600, -720];
    function run(a) {
      console.log(a, numbers);
      // Ext.get('common-spinner').setStyle('background-position', numbers[c++] + 'px 0px');
      // if (c >= numbers.length) {
      //     c = 0;
      // }
      c++;
      console.log(c)
      timer = setTimeout(run, 2000, c);
    }
    timer = setTimeout(run, 2000);

    return stop;

    function stop() {
        if (timer) {
            clearTimeout(timer);
            timer = 0;
        }
    }
}


var stop = setBgPosition();
// ...later, when you're ready to stop...
// stop();


