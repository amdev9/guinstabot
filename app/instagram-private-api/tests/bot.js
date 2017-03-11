const Client = require('../client/v1'); 

// amahuisoardsvil933 pasaqwrds123

// Create empty session

var user = 'ratm9111';
var password = 'qwe123qwe';
var device = new Client.Device(user);
var storage = new Client.CookieFileStorage(__dirname + '/cookies/'+ user+'.json');
var session = new Client.Session(device, storage);


var token = {}
Client.Request.setStopToken(token)

new Client.Session.login(session, 'ratm9111', 'qwe123qwe').then(function(session) {
  console.log(session)
})



// var device, storage, user, password;
// you get those from previous examples

// function challengeMe(error) {
//     return Client.Web.Challenge.resolve(error)
//         .then(function(challenge) {
//             // challenge instanceof Client.Web.Challenge
//             console.log(challenge.type);
//             // can be phone, email, or captcha
//             // let's assume we got email
//             if(!challenge.type !== 'email') return;
//             // Will send request to send email to you
//             // email will be one associated with your account
//             return challenge.email();
//         })
//         .then(function(challenge) {
//             // Ok we got to the next step, the response code expected by Instagram
//             return challenge.code('816495');
//         })
//         .then(function(challenge) {
//             // Yey Instagram accepted the code
//             // now we confirmed that Instagram is happy, weird :P
//             return challenge.confirmate()
//         })
//         .then(function(challenge) {
//             // And we got the account confirmed!
//             // so let's login again
//             return loginAndFollow(device, storage, user, password);
//         })

// }


// function loginAndFollow(device, storage, user, password) {
//     return Client.Session.create(device, storage, user, password)
//         .then(function(session) {
//             // Now you have a session, we can follow / unfollow, anything...
//             // And we want to follow Instagram official profile
//             return [session, Client.Account.searchForUser(session, 'instagram')]   
//         })
//         .spread(function(session, account) {
//             return Client.Relationship.create(session, account.id);
//         })
// }


// loginAndFollow(device, storage, user, password)
//     .catch(Client.Exceptions.CheckpointError, function(error){
//         // Ok now we know that Instagram is asking us to
//         // prove that we are real users
//         return challengeMe(error);
//     }) 
//     .then(function(relationship) {
//         console.log(relationship.params)
//         // {followedBy: ... , following: ... }
//         // Yey, you just followed an account
//     });
 


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

