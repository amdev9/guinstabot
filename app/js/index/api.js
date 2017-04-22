//////////////////////////////////
///////////// API ////////////////
//////////////////////////////////

'use strict';

const Client = require('./instagram-private-api').V1; 
var fs = require('fs');
var os = require('os'), EOL = os.EOL;
var path = require('path')
var Promise = require('bluebird');
var async = require('async');
var config = require('./config/default');
var softname = config.App.softname;

var cookieDir = path.join(os.tmpdir(), softname.replace(/\s/g,'') , 'cookie');


/*****************************
 * TASK Parse geo            *                      
 *****************************/

function parseGeoApi(task, token) { 
  mkdirFolder(logsDir)
  .then(function() {

    setStateView(task._id, 'run');
    loggerDb(task._id, 'Парсинг по гео');
    
    fs.readFile(task.proxy_file, 'utf8', function(err, proxy_array) {
      if (err) throw err;

      proxy_array = proxy_array.replace(/ /g, "").split(/\r\n|\r|\n/).filter(isEmpty).filter(validateProxyString);
      var proxy = returnProxyFunc( _.shuffle(proxy_array)[0] );
  
      // FIND LOCATIONS
      var iLoc = 0, iCode = 0, iUser = 0;
      var lng = task.centroid[0]
      var lat = task.centroid[1]
      var distance = Math.floor(task.distance * 1000)
      var tok = '208737209614557|nZI7t9ZvRjfVkjeBzAaP3juvAyQ'
      var locations = 'https://graph.facebook.com/search?type=place&center=' + lat + ',' + lng + '&distance=' + distance + '&limit=100&access_token=' + tok 
      console.log(locations)
      var fb;
      var locations_array = [];

      var genToken = { proxy: proxy, locations: locations }
      token.push(genToken)

      var fb = new Client.Web.fbSearchPlace(proxy, locations, genToken);

      var promiseWhile = Promise.method(function(condition, action) {
        if (condition())
          return;
        return action()
          .then(promiseWhile.bind(null, condition, action));
      });

      var condFunc = function() {      
        return getStateView(task._id) == 'stop' || getStateView(task._id) == 'stopped' || fb.getCursor() == null;
      }

      var actionFunc = function() {
        return fb.get()
        .then(function(res) {
          var jsonRes = JSON.parse(res.body)
          iLoc += jsonRes.data.length
          render3View(task._id, iLoc, iCode, iUser)
          jsonRes.data.forEach(function(item) {
            locations_array.push(item.id)
          })
          
        });
      };

      promiseWhile(condFunc, actionFunc)
      .then(function() {
        var chunked = _.chunk(locations_array, proxy_array.length);
        var limit = 5; 
        var mediaCodes = [];
        async.eachLimit(chunked, limit, function( item, callbackOut) { 
          var chnk = _.zipObject(item, _.shuffle(proxy_array)) 
          async.mapValues(chnk, function(proxy, location, callback) {

            var genToken = { proxy: proxy, location: location }
            token.push(genToken)

            // LOCATION FEED
            var locationReq = new Client.Web.Geolocation(returnProxyFunc(proxy), location, task.max_limit, genToken);

            var promiseWhile = Promise.method(function(condition, action) {
              if (condition())
                return;
              return action()
                .then(promiseWhile.bind(null, condition, action));
            });
            var condFunc = function() {     
              return getStateView(task._id) == 'stop' || getStateView(task._id) == 'stopped' || locationReq.getCursor() == null; // !res.location.media.page_info.end_cursor
            }
            var actionFunc = function() {
              return locationReq.get()
              .then(function(res) { 

                iCode += res.location.media.nodes.length;
                render3View(task._id, iLoc, iCode, iUser);

                res.location.media.nodes.forEach(function(node) {
                  mediaCodes.push(node.code)    
                })
              })
            };

            promiseWhile(condFunc, actionFunc)
            .then(function() {
              console.log('done1')
              callback()
            })
            .catch(function(err) {
              if(err.message == "Cancelled") {
                callback(err)
              } else { 
                console.log(err)
                callback()
              }
            })
          
          }, function(err, result) {
             
            if (err) {
              console.log('callbackOut(err);')
              callbackOut(err); // if cancelled
            } else {
              console.log('callbackOut()')
              callbackOut()
            }
          })
        }, function(err) {
          if( err ) {
            console.log('A file failed to process');
            setStateView(task._id, 'stopped');
          } else {

              var chunked = _.chunk(mediaCodes, proxy_array.length);
              var lim = 5;
              async.eachLimit(chunked, lim, function(item, callbackOut) { 
                var chnk = _.zipObject(item, _.shuffle(proxy_array)) 
                console.log(item)
                async.mapValues(chnk, function(proxy, code, callback) {
                  var mediaRequest = new Client.Web.Media();
                  mediaRequest.get(code, returnProxyFunc(proxy))
                  .then(function(owner) {
                    iUser += 1
                    appendStringFile(task.output_file, owner.username); 
                    render3View(task._id, iLoc, iCode, iUser);
                    callback()
                  })
                  .catch(function(err) {
                    console.log(err)
                  })
                }, function(err, result) {
                  render3View(task._id, iLoc, iCode, iUser);
                  if (err) {
                    console.log('callbackOut(err);')
                    callbackOut(err); 
                  } else {
                    console.log('callbackOut()')
                    callbackOut()
                  }
                })

              }, function(err) {
                if( err ) {
                  console.log('A file failed to process');
                  setStateView(task._id, 'stopped');
                } else {
                  render3View(task._id, iLoc, iCode, iUser);
                  console.log('All files have been processed successfully');
                  setStateView(task._id, 'stopped');
                }
              });
               
          }

        });
      })
      .catch(function (err) {
        if(err.message == "Cancelled") {
          setStateView(task._id, 'stopped');
        } else { 
          console.log(err)
          setStateView(task._id, 'stopped');
        }
      })
    });
  })
  .catch(function(err) {
    console.log(err)
  }) 
   
}


/*****************************
 * TASK Create accounts      *                      
 *****************************/
 
function createApi(task, token) { //  add timeot between same proxy
  mkdirFolder(logsDir)
  .then(function() {
    mkdirFolder(cookieDir)
  })
  .then(function() {
    setStateView(task._id, 'run');
    loggerDb(task._id, 'Регистрация аккаунтов');
    setCompleteView(task._id, '-');

    const NAMES = require('./config/names').names;
    const SURNAMES = require('./config/names').surnames;

    fs.readFile(task.proxy_file, 'utf8', function(err, proxy_array) {
      if (err) throw err;
      proxy_array = proxy_array.replace(/ /g, "").split(/\r\n|\r|\n/).filter(isEmpty).filter(validateProxyString);

      var email_array = [];
      if (!task.own_emails) {
        for(var i = 0; i < task.emails_cnt; i++) {
          var name = SURNAMES[Math.floor(Math.random() * SURNAMES.length)] + NAMES[Math.floor(Math.random() * SURNAMES.length)];
          email_array.push(name + getRandomInt(1000, 999999) + '@gmail.com');
        }
      } else {
        email_array = task.email_parsed;
      }

      if(!proxy_array || email_array.length == 0) {
        console.log("empty");
        return;
      }

      var chunked = _.chunk(email_array, proxy_array.length);
      var filterSuccess = 0;
      var indicator = 0;
      var count1 = 0;
      var limit = 1;  

      var timerArr = timers.get(task._id)
      async.eachLimit(chunked, limit, function( item, callbackOut) { 
        var chnk = _.zipObject(item, _.shuffle(proxy_array)) 
        
        
        async.mapValues(chnk, function(proxy, email, callback) {
          
          var genToken = { proxy: proxy, email: email }
          token.push(genToken)
        
          var username = email.split("@")[0];
          var password = generatePassword(); 
          var cookiePath = path.join(cookieDir, email + '.json')
          var storage = new Client.CookieFileStorage(cookiePath);
          var device = new Client.Device(email);
          var session = new Client.Session(device, storage, returnProxyFunc(proxy) );
          session.token = genToken; 

          new Client.AccountEmailCreator(session)
          .setEmail(email)
          .setUsername(username)
          .setPassword(password)
          .setName('')
          .register()
          .spread(function(account, discover) {
            indicator++;
            filterSuccess++;
            appendStringFile(task.output_file, account._params.username + "|" + password + "|" + proxy); 
            renderUserCompletedView(task._id, email_array.length, indicator, filterSuccess)
            callback();
          })
          .catch(function(err) {
            indicator++;
            if(err.message == "Cancelled") {
              callback(err)
            } else { 
              console.log(err)
              // renderUserCompletedView(task._id, users_array.length, indicator, filterSuccess); 
              callback()
            }
          })
        }, function(err, result) {
   
          renderUserCompletedView(task._id, email_array.length, indicator, filterSuccess); 
          if (err) {
            console.log('callbackOut(err);')
            callbackOut(err); // if cancelled
          } else {
            var tim = (indicator == email_array.length) ? 0 : task.reg_timeout * 1000

            var timerId = setTimeout(function() {
              console.log('callbackOut()')
              callbackOut()
              timerArr.pop(timerId)
            }, tim)
            timerArr.push(timerId)
          }
        })
      }, function(err) {
        if( err ) {
          console.log('A file failed to process');
          setStateView(task._id, 'stopped');
        } else {
          console.log('All files have been processed successfully');
          setStateView(task._id, 'stopped');
        }
      });
    })
  })
  .catch(function(err) {
    console.log(err);
    setStateView(task._id, 'stopped');
  })
}

/*****************************
 * TASK Filter accounts      *                      
 *****************************/

function mediaFilter(json, task, proxy, cb) {
  var filterRequest = new Client.Web.Filter(token);
  filterRequest.media(json.username, proxy)
  .then(function(response) {
    // check data of media 
    console.log('mediaFilter')
    appendStringFile(task.outputfile, json.username);
    cb(true);
  });
}

function filterFunction(json, task, proxy, cb) {

  var followersCond = json.followerCount > task.followers.from && json.followerCount < task.followers.to;
  var subscribersCond = json.followingCount > task.subscribers.from && json.followingCount < task.subscribers.to;
  var publicationsCond = json.mediaCount > task.publications.from && json.mediaCount < task.publications.to;
  if (task.private == 'all') {
    var privateCond = true;
  } else if (task.private == 'private') {
    var privateCond = json.isPrivate == true;
  } else if (task.private == 'open') {
    var privateCond = json.isPrivate == false;
  }
  if (followersCond && subscribersCond && publicationsCond && privateCond ) {
    if (task.stop_words_file != "") {
      fs.readFile(task.stop_words_file, function(err, f) {
      var words = f.toString().split(EOL).filter(isEmpty);
      words.forEach(function (word) {
        word = word.toLowerCase();
        var fullName = json.fullName ? json.fullName.toLowerCase() : '';
        var biography = json.biography ? json.biography.toLowerCase() : '';
        if (word != "" && fullName.indexOf(word) == -1 && biography.indexOf(word) == -1 ) {
          if (task.lastdate != "" && json.isPrivate == false && json.mediaCount > 0) {
            mediaFilter(json, task, proxy, cb);
          } else {
            appendStringFile(task.outputfile, json.username);
            cb(true);
          }
        }
      })
    });
    } else {
      appendStringFile(task.outputfile, json.username);
      cb(true);
    }
  } else {
    cb(false);
  }
}


function filterApi(task, token) { 
  mkdirFolder(logsDir)
  .then(function() {
    setStateView(task._id, 'run');    
    loggerDb(task._id, 'Фильтрация аудитории');
    setCompleteView(task._id, '-');
    fs.truncate(task.outputfile, 0, function() { 
      loggerDb(task._id, 'Файл подготовлен');
    });

    fs.readFile(task.proxy_file, 'utf8', function(err, proxy_array) {
      proxy_array = proxy_array.split(EOL).filter(isEmpty).filter(validateProxyString);
      if (err) throw err;
      fs.readFile(task.inputfile, 'utf8', function(err, users_array) {
        users_array = users_array.split(EOL).filter(isEmpty);
        var chunked = _.chunk(users_array, proxy_array.length);
        var filterSuccess = 0;
        var indicator = 0;
        var limit = 5; // test optimal value
        async.eachLimit(chunked, limit, function( item, callbackOut) { 
          var chnk = _.zipObject(item, _.shuffle(proxy_array)) 
          async.mapValues(chnk, function(proxy, filtername, callback) {
            
            var genToken = { proxy: proxy, filtername: filtername }
            token.push(genToken)
            var filterRequest = new Client.Web.Filter(genToken);
            var filterAsync = function(filtername, proxy, cb) {
              filterRequest.getUser(filtername, returnProxyFunc(proxy))
              .then(function(res) { 
                filterFunction(res, task, returnProxyFunc(proxy), function(bool) { 
                  if (bool) {
                    filterSuccess += 1;
                  }
                  renderUserCompletedView(task._id, users_array.length, indicator, filterSuccess); 
                  cb()
                });
              })
              .catch(function(err) {   
                if(err.message == "Cancelled") {
                  cb(err)
                } else { 
                  if (err.statusCode != 404) {
                    console.log(err)
                  }
                  cb()
                }
              });
            }
            function myFunction(filtername, proxy, callbackF) {
              filterAsync(filtername, proxy, function(err) {
                if (err) return callbackF(err);
                return callbackF();
              });
            }
            var wrappedFilter = async.timeout(myFunction, 10000);
            wrappedFilter(filtername, proxy, function(err) {
              indicator++;
              if (err) {
                 // here token cancel
                if (err.code === 'ETIMEDOUT') {
                  console.log('------<')
                  console.log(proxy, filtername)

                  // token.cancel for this request

                  // console.log(err)
                  callback() // if timeout error -> else err.message == 'Cancelled', etc callback(err)
                } else {
                  callback(err)
                }
              } else {
                callback()
              }
            });
          }, function(err, result) {
            renderUserCompletedView(task._id, users_array.length, indicator, filterSuccess); 
            if (err) {
              console.log('callbackOut(err);')
              callbackOut(err); 
            } else {
              console.log('callbackOut()')
              callbackOut()
            }
          })
        }, function(err) {
          if( err ) {
            console.log('A file failed to process');
            setStateView(task._id, 'stopped');
          } else {
            console.log('All files have been processed successfully');
            setStateView(task._id, 'stopped');
          }
        });
      })
    })
  })
  .catch(function(err) {
    console.log(err)
  })
}

/*****************************
 * USER Parse concurents     *                      
 *****************************/
 
function parseApi(user, task, token) {

  mkdirFolder(cookieDir)
  .then(function() {
    setStateView(user._id, 'run');
    renderNewTaskCompletedView(user._id);
    loggerDb(user._id, 'Парсинг аудитории');

    fs.truncate(task.outputfile, 0, function() { 
      loggerDb(user._id, 'Файл подготовлен'); 
    });

    var indicator = 0;
    const device = new Client.Device(user.username);
    var cookiePath = path.join(cookieDir, user._id + '.json');
    const storage = new Client.CookieFileStorage(cookiePath);
    
    var ses = Client.Session.create(device, storage, user.username, user.password, returnProxyFunc(user.proxy))
      .then(function(session) {
        if(session) {
          updateUserStatusDb(user._id, 'Активен');
          session.token = token;
          return session;
        }
      })

    if(task.parsed_conc.length == 0) {
      throw new Error("stop");  
    }
    async.eachSeries(task.parsed_conc, function(parsename, callback) {
      var count = 0;
      ses.then(function(session) {
        return [session, Client.Account.searchForUser(session, parsename)]   
      }).all()
      .then(function([session, account]) {
        var feed;
        if (task.parse_type == true) {
          feed = new Client.Feed.AccountFollowers(session, account.id);
        } else {
          feed = new Client.Feed.AccountFollowing(session, account.id);
        }
        var promiseWhile = Promise.method(function(condition, action) {
          if (condition())
            return;
          return action()
            .then(promiseWhile.bind(null, condition, action));
        });
        var condFunc = function() {
          return getStateView(task._id) == 'stop' || getStateView(task._id) == 'stopped' || count >= task.max_limit;
        }
        var actionFunc = function() {
          return feed.get()
          .then(function(res) { 
            res.forEach(function (item, i , arr) {
              if (count < task.max_limit) {
                appendStringFile(task.outputfile, item._params.username);
                renderTaskCompletedView(user._id);
              }
              count++
            });
            if (!feed.getCursor()) {
              throw new Error('cursor')
            }
          });
        };
        promiseWhile(condFunc, actionFunc)
        .then(function() {
          console.log(parsename + ' done!');
          callback()         
        })
        .catch(function (err) {
          if (err.message == "Cancelled") {
            callback(err)
          } else {
            console.log(err)
            callback()
          }
        })
      })
      .catch(function (err) {
        if (err.message == "Cancelled") {
          callback(err)
        } else {
          console.log(err)
          callback()
        }
      });
    }, function(err) {
      if( err ) {
        console.log('A file failed to process');
        setStateView(user._id, 'stopped');
      } else {
        console.log('All files have been processed successfully');
        setStateView(user._id, 'stopped');
      }
    });
  })
  .catch(function(err) {
    console.log(err);
    setStateView(user._id, 'stopped');
  })
}


/*****************************
 * USER covert id            *                      
 *****************************/

function convertApi(user, task, token) {
  mkdirFolder(cookieDir)
  .then(function() {
    setStateView(user._id, 'run');
    renderNewTaskCompletedView(user._id);
    loggerDb(user._id, 'Конвертация');

    fs.truncate(task.outputfile, 0, function() { 
      loggerDb(user._id, 'Файл подготовлен'); 
    });

    const device = new Client.Device(user.username);
    var cookiePath = path.join(cookieDir, user._id + '.json');
    const storage = new Client.CookieFileStorage(cookiePath);
    var limit = 1;
    var indicator  = 0;
    var ses = Client.Session.create(device, storage, user.username, user.password, returnProxyFunc(user.proxy))
    .then(function(session) {
      if(session) {
        updateUserStatusDb(user._id, 'Активен');
        session.token = token;
        return session;
      }
    })
    .then(function(session) {
      async.eachLimit(task.parsed_conc, limit, function(item, callback) {       
      
        new Client.Account.getById(session, item) // change to web request
        .then(function(account) {
          indicator++;

          console.log(account.params.username, indicator);
          callback();
        })

      }, function(err) {
        if( err ) {
          console.log('A file failed to process');
          setStateView(user._id, 'stopped');
        } else {
          console.log('All files have been processed successfully');
          setStateView(user._id, 'stopped');
        }
      });
    });
  })
  .catch(function(err) {
    console.log(err);
    setStateView(user._id, 'stopped');
  })
}

/*****************************
 * USER Check accounts       *                          
 *****************************/

function checkApi(user_id, username, password, proxy, token) {
  mkdirFolder(cookieDir)
  .then(function() {
   
    setStateView(user_id, 'run');
    loggerDb(user_id, 'Выполняется логин');
    var device = new Client.Device(username);
    var cookiePath = path.join(cookieDir, username + ".json");
    var storage = new Client.CookieFileStorage(cookiePath);
    var session = new Client.Session(device, storage);
    session.token = token;
    if(_.isString(proxy) && !_.isEmpty(proxy)) {
      session.proxyUrl = returnProxyFunc(proxy);
    }
    Client.Session.login(session, username, password)
    .then(function(session) {
      updateUserStatusDb(user_id, 'Активен');
      setStateView(user_id, 'stopped');
    })
    .catch(function (err) {
      setStateView(user_id, 'stopped');
      if (err instanceof Client.Exceptions.APIError) {
        if(err.ui) {
          updateUserStatusDb(user_id, err.ui); 
        } else if (err.name == 'RequestCancel') {

        }
        else {
          updateUserStatusDb(user_id, err.name);
        }
      } else {
        updateUserStatusDb(user_id, 'Произошла ошибка');
        console.log(err);
      }
    });
  })
}
