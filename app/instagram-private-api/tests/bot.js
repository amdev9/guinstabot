const Client = require('../client/v1'); 

// amahuisoardsvil933 pasaqwrds123

// Create empty session
var device = new Client.Device('amahuisovil933');
var storage = new Client.CookieFileStorage(__dirname + '/cookies/'+ 'amahuisovil933'+'.json');
var session = new Client.Session(device, storage);
new Client.AccountEmailCreator(session)
    .setEmail('amahuisovil9asaasfrdsf33@gmail.com')
    .setUsername('amahuisoardsvil933')
    .setPassword('pasaqwrds123')
    .setName('')
    .register()
    .spread(function(account, discover) {
        // account instanceof Client.Account
        console.log("Created Account", account)
        console.log("Discovery Feed", discover);
    })

