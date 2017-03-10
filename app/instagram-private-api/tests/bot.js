const Client = require('../client/v1'); 

// amahuisoardsvil933 pasaqwrds123

// Create empty session
var device = new Client.Device('ratm9111');
var storage = new Client.CookieFileStorage(__dirname + '/cookies/'+ 'ratm9111'+'.json');
var session = new Client.Session(device, storage);


var token = {}
Client.Request.setStopToken(token)

new Client.Session.login(session, 'ratm9111', 'qwe123qwe').then(function(session) {
  console.log(session)
})


// setTimeout(function() {
//   if (typeof token.cancel === "function") { 
//     token.cancel()
//   }
// }, 5)

// new Client.AccountEmailCreator(session)
//     .setEmail('amahuisovil9asaasfrdsf33@gmail.com')
//     .setUsername('amahuisoardsvil933')
//     .setPassword('pasaqwrds123')
//     .setName('')
//     .register()
//     .spread(function(account, discover) {
//         // account instanceof Client.Account
//         console.log("Created Account", account)
//         console.log("Discovery Feed", discover);
//     })

