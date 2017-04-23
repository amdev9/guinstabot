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

function findLocationFb(task, token, proxy_array, iRender) {
 
  var proxy = returnProxyFunc( _.shuffle(proxy_array)[0] );

  // FIND LOCATIONS

  var lng = task.centroid[0]
  var lat = task.centroid[1]
  var distance = Math.floor(task.distance * 1000)
  var tok = '208737209614557|nZI7t9ZvRjfVkjeBzAaP3juvAyQ'
  var locations = 'https://graph.facebook.com/search?type=place&center=' + lat + ',' + lng + '&distance=' + distance + '&limit=100&access_token=' + tok 
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
      iRender.iLoc += jsonRes.data.length
      render3View(task._id, iRender.iLoc, iRender.iCode, iRender.iUser)
      jsonRes.data.forEach(function(item) {
        locations_array.push(item.id)
      })
    });

    
  };
  return promiseWhile(condFunc, actionFunc)
  .then(function() {
    mediaFromLocation(task, token, proxy_array, locations_array, iRender)
  })
}


function mediaFromLocation(task, token, proxy_array, locations_array, iRender) {
  var chunked = _.chunk(locations_array, proxy_array.length);
  var limit = 5; 
  var mediaCodes = [];

  async.eachLimit(chunked, limit, function( item, callbackOut) { 
    var chnk = _.zipObject(item, _.shuffle(proxy_array)) 
    async.mapValues(chnk, function(proxy, location, callback) {

      var genToken = { proxy: proxy, location: location }
      token.push(genToken)

      // LOCATION FEED
      ///////////// wrap all this


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

          iRender.iCode += res.location.media.nodes.length;
          render3View(task._id, iRender.iLoc, iRender.iCode, iRender.iUser);

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

      ///////////////


    
    }, function(err, result) {
       
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
      mediaCodeParse(task, token, proxy_array, locations_array, mediaCodes, iRender)
    }
  });
}

var mediaAsync = function(genToken, task, iRender, code, proxy, cb) {
  
  var mediaRequest = new Client.Web.Media(genToken);
  mediaRequest.get(code, returnProxyFunc(proxy))
  .then(function(owner) {
    iRender.iUser += 1
    appendStringFile(task.output_file, owner.username); 
    render3View(task._id, iRender.iLoc, iRender.iCode, iRender.iUser);
    cb()
  })
  .catch(function(err) {
    if(err.message == "Cancelled") {
      cb(err)
    } else { 
      console.log(err)
      cb()
    }
  })
}

function mediaFunction(genToken, task, iRender, code, proxy, callback) {
  mediaAsync(genToken, task, iRender, code, proxy, function(err) {
    if (err) return callback(err);
    return callback();
  });
}

function mediaCodeParse(task, token, proxy_array, locations_array, mediaCodes, iRender) {
  console.log('Start media code parsing');
  var chunked = _.chunk(mediaCodes, proxy_array.length);
  var lim = 5;
  async.eachLimit(chunked, lim, function(item, callbackOut) { 
    var chnk = _.zipObject(item, _.shuffle(proxy_array)) 
    async.mapValues(chnk, function(proxy, code, callback) {
      
      var genToken = { proxy: proxy, code: code }
      token.push(genToken)

      var wrappedMedia = async.timeout(mediaFunction, 10000);
      wrappedMedia(genToken, task, iRender, code, proxy, function(err) {
        if (err) {
          if (err.code === 'ETIMEDOUT') {
            console.log('------<')
            console.log(proxy, code)
            genToken.cancel()
            callback() 
          } else {
            // console.log(err)
            callback(err)
          }
        } else {
          callback()
        }
      });

    }, function(err, result) {
      render3View(task._id, iRender.iLoc, iRender.iCode, iRender.iUser);
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
      render3View(task._id, iRender.iLoc, iRender.iCode, iRender.iUser);
      console.log('All files have been processed successfully');
      setStateView(task._id, 'stopped');
    }
  });
}

function parseGeoApi(task, token) { 
  mkdirFolder(logsDir)
  .then(function() {

    setStateView(task._id, 'run');
    loggerDb(task._id, 'Парсинг по гео');
    var iRender = {};
    iRender.iLoc = 0, iRender.iCode = 0, iRender.iUser = 0;
    fs.readFile(task.proxy_file, 'utf8', function(err, proxy_array) {
      if (err) throw err;
      proxy_array = proxy_array.replace(/ /g, "").split(/\r\n|\r|\n/).filter(isEmpty).filter(validateProxyString).filter(function(elem, index, self) {
        return index == self.indexOf(elem);
      });

      findLocationFb(task, token, proxy_array, iRender)
      .catch(function (err) {
        if(err.message == "Cancelled") {
          setStateView(task._id, 'stopped');
        } else { 
          console.log(err)
          setStateView(task._id, 'stopped');
        }
      })
    })
  
  })
  .catch(function(err) {
    console.log(err)
  }) 
}


/*****************************
 * TASK Create accounts      *                      
 *****************************/
 
function chunkedCreate(task, token, proxy_array) {
  const NAMES = require('./config/names').names;
  const SURNAMES = require('./config/names').surnames;

  var email_array = [];
  if (!task.own_emails) {
    email_array = _.times(task.emails_cnt, function() {
      var name = SURNAMES[Math.floor(Math.random() * SURNAMES.length)] + NAMES[Math.floor(Math.random() * SURNAMES.length)];
      return name + getRandomInt(1000, 999999) + '@gmail.com';
    })
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
          // console.log(err) // to log file
          renderUserCompletedView(task._id, email_array.length, indicator, filterSuccess); 
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

}

function createApi(task, token) { //  add timeot between same proxy
  mkdirFolder(logsDir)
  .then(function() {
    mkdirFolder(cookieDir)
  })
  .then(function() {
    setStateView(task._id, 'run');
    loggerDb(task._id, 'Регистрация аккаунтов');
    setCompleteView(task._id, '-');

    fs.readFile(task.proxy_file, 'utf8', function(err, proxy_array) {
      if (err) throw err;
      proxy_array = proxy_array.replace(/ /g, "").split(/\r\n|\r|\n/).filter(isEmpty).filter(validateProxyString).filter(function(elem, index, self) {
        return index == self.indexOf(elem);
      });

      chunkedCreate(task, token, proxy_array)
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

function mediaFilter(json, task, proxy, genToken, callback) {
  
  var filterRequest = new Client.Web.Filter(genToken); 
  filterRequest.media(json.username, proxy)
  .then(function(response) {
    
    var timestamp = response.items[0].created_time;
    var instaDate = new Date(timestamp*1000);
    var uiDate = new Date(task.lastdate);

    if(uiDate.getTime() < instaDate.getTime()) {
      callback(null, true);
    } else {
      callback();
    }
    
  })
  .catch(function(err) {   
    if(err.message == "Cancelled") {
      callback(err)
    } else { 
      if (err.statusCode != 404) {
        console.log(err)
      }
      callback()
    }
  });
}


function filterFunction(json, task, proxy, genToken, cb) {
 
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
      fs.readFile(task.stop_words_file, 'utf8', function(err, f) {
        if (err) throw err;
        var words = f.toString().split(EOL).filter(isEmpty);


        async.each(words, function(word, callback) {
          word = word.toLowerCase();
          var fullName = json.fullName ? json.fullName.toLowerCase() : '';
          var biography = json.biography ? json.biography.toLowerCase() : '';
          if (fullName.indexOf(word) == -1 && biography.indexOf(word) == -1 ) { // word not found 
            callback() 
          } else {
            callback(new Error('Found')) 
          }
        }, function(err) {
          if( err ) {
            // console.log('A file failed to process', err);
            cb();
          } else {
            // console.log('All files have been processed successfully');
            if (task.lastdate != "" && json.isPrivate == false && json.mediaCount > 0) {
              mediaFilter(json, task, proxy, genToken, cb);
            } else {
              cb(null, true);
            }
          }
        });


      });

    } else {
      if (task.lastdate != "" && json.isPrivate == false && json.mediaCount > 0) {
        mediaFilter(json, task, proxy, genToken, cb);
      } else {
        cb(null, true);
      }
    }

  } else {
    cb();
  }
}


var filterAsync = function(task, genToken, users_array, iRender, filtername, proxy, cb) {
  
  var filterRequest = new Client.Web.Filter(genToken);
  filterRequest.getUser(filtername, returnProxyFunc(proxy))
  .then(function(res) { 

    filterFunction(res, task, returnProxyFunc(proxy), genToken, function(err, bool) { 
      if (err) {
        if(err.message == "Cancelled") {
          cb(err)
        } else { 
          if (err.statusCode != 404) {
            console.log(err)
          }
          cb()
        }
      } else {
        if (bool) {
          iRender.iSuccess += 1;
          appendStringFile(task.outputfile, filtername);
        }

        renderUserCompletedView(task._id, users_array.length, iRender.iIter, iRender.iSuccess); 
        cb()
      }
    })
     
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

function myFunction(task, genToken, users_array, iRender, filtername, proxy, callback) {
  filterAsync(task, genToken, users_array, iRender, filtername, proxy, function(err) {
    if (err) return callback(err);
    return callback();
  });
}

function chunkedFilter(task, token, proxy_array, users_array) {

  var chunked = _.chunk(users_array, proxy_array.length);

  var iRender = {};
  iRender.iIter = 0, iRender.iSuccess = 0;
  var iii = 0;
  var limit = 5; // test optimal value
  async.eachLimit(chunked, limit, function( item, callbackOut) {  // repeats
    var chnk = _.zipObject(item, _.shuffle(proxy_array))  // repeats

     // console.log( chnk, _.size(chnk))
    async.mapValues(chnk, function(proxy, filtername, callback) {
       
      var genToken = { proxy: proxy, filtername: filtername }
      token.push(genToken)

      var wrappedFilter = async.timeout(myFunction, 20000);
      
      wrappedFilter(task, genToken, users_array, iRender, filtername, proxy, function(err) {
        // console.log(iRender.iIter, filtername, proxy)
        iRender.iIter++;
        if (err) {
          if (err.code === 'ETIMEDOUT') {
            // console.log('------<')
            // console.log(proxy, filtername)
            genToken.cancel() 
            callback() 
          } else {
            // console.log(err)
            callback(err)
          }
        } else {
          callback()
        }
      });

    }, function(err, result) {
      renderUserCompletedView(task._id, users_array.length, iRender.iIter, iRender.iSuccess); 
      if (err) {
        // console.log('callbackOut(err);')
        callbackOut(err); 
      } else {
        // console.log('callbackOut()')
        callbackOut()
      }
    })
  }, function(err) {
    renderUserCompletedView(task._id, users_array.length, iRender.iIter, iRender.iSuccess); 
    if( err ) {
      // console.log('A file failed to process');
      setStateView(task._id, 'stopped');
    } else {
      // console.log('All files have been processed successfully');
      setStateView(task._id, 'stopped');
    }
  });
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
      if (err) throw err;
      proxy_array = proxy_array.split(EOL).filter(isEmpty).filter(validateProxyString).filter(function(elem, index, self) {
        return index == self.indexOf(elem);
      });

      fs.readFile(task.inputfile, 'utf8', function(err, users_array) {
        if (err) throw err;
        users_array = users_array.split(EOL).filter(isEmpty).filter(function(elem, index, self) {
          return index == self.indexOf(elem);
        });
        chunkedFilter(task, token, proxy_array, users_array);
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
 

function parseSes(user, task, token, ses) {

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

}


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

    parseSes(user, task, token, ses);

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
