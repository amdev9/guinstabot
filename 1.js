var promiseWhile = function(action) {
  return new Promise(function(resolve, reject) { 
    var indicator = 0;

    var func = function(results) { 
      if (results) {
        indicator++;
        console.log(results)
      }
      if (indicator == 4) {  
        return reject(new Error("stop"));  
      }
      return Promise.resolve(action())
        .then(func)
        .catch(function(err) {
          reject(err)
        }) 
    }

    process.nextTick(func)
  }) 
}

promiseWhile(function() {
  return new Promise(function(resolve, reject) {
    setTimeout(function() {
      resolve(6); 
    }, 2000);
  });
})
.catch(function (err) {

  console.log(err);
   
});

