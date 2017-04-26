const Client = require('../client/v1'); 

// amahuisoardsvil933 pasaqwrds123

// Create empty session
var _ = require('lodash')
var username = 'ratm9111';
var password = 'qwe123qwe';
var device = new Client.Device(username);
var storage = new Client.CookieFileStorage(__dirname + '/cookies/'+ username +'.json');
var proxy = 'http://blackking:Name0123Space@45.76.34.156:30002'
var session = new Client.Session(device, storage, proxy);




new Client.Session.login(session, username, password)
.then(function(session) {

  console.log(session)

  new Client.Upload.photo(session, '/Users/alex/Desktop/docs/other/7.jpg')
  .then(function(upload) {
    // upload instanceof Client.Upload
    // nothing more than just keeping upload id
    console.log(upload.params.uploadId);
    return Client.Media.configurePhoto(session, upload.params.uploadId, 'akward2 caption');
  })
  .then(function(medium) {
    // we configure medium, it is now visible with caption
    console.log(medium.params)
  })



})



  // console.log(session)
  // Client.Location.searchGeo(session, 55.852750, 37.415950) // search
  //   .then(function(locations) {
  //     // console.log(locations.length)
  //     // locations.forEach(function(loc, i) {
  //     //   if (i == 80) {
  //     //     console.log(loc)
  //     //   }
  //     //   console.log(loc._params.id)
  //     // })
  //       var locationFeed = new Client.Feed.LocationMedia(session, 107248442645764); //_.first(locations).id);
  //       return locationFeed.get();
  //   })
  //   .then(function(media) {
  //       var first = media[0];
  //       console.log(media)
  //   })

  
 


  // var locations = 'https://graph.facebook.com/search?type=place&center=' + lat + ',' + lng + '&distance=' + distance + '&access_token=208737209614557|nZI7t9ZvRjfVkjeBzAaP3juvAyQ' // &after=MjQZD



// var locationReq = new Client.Web.Geolocation();   

// locationReq.get(proxy, 256622341134762)
// .then(function(res) {
//   var maxId = res.location.media.page_info.end_cursor
//   locationReq.get(proxy, 256622341134762, maxId)
//     .then(function(res) {
//       console.log(res)
//     })

//   // console.log(res.location.media.nodes)
// })

// new Client.Session.login(session, username, password)
// .then(function(session) {
//   // console.log(session)
//   Client.Location.searchGeo(session, 55.852750, 37.415950) // search
//     .then(function(locations) {
//       // console.log(locations.length)
//       // locations.forEach(function(loc, i) {
//       //   if (i == 80) {
//       //     console.log(loc)
//       //   }
//       //   console.log(loc._params.id)
//       // })
//         var locationFeed = new Client.Feed.LocationMedia(session, 107248442645764); //_.first(locations).id);
//         return locationFeed.get();
//     })
//     .then(function(media) {
//         var first = media[0];
//         console.log(media)
//     })


// })
 





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

