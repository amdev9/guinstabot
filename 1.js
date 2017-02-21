

var Promise = require('bluebird');

function getExistedUserRows(rows) {
  var result = [];
  
  return new Promise(function(resolve, reject) {
    rows.forEach(function(row_id, i) {
      
      result.push(row_id);
      if (i == rows.length - 1) {
        resolve(result);  
      }
       
    });
  })
  
}

getExistedUserRows(['911', 'qwe']).then(function(res) {
  console.log(res);
})  