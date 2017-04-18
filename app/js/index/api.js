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


function mediaFilter(json, task, proxy, cb) {
  var filterRequest = new Client.Web.Filter();
  filterRequest.media(json.username, proxy).then(function(response) {
    appendStringFile(task.outputfile, json.username);
    cb();
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




function fastCreateAccount(task, email, username, password, proxy, token, cb) {

  var cookiePath = path.join(cookieDir, email + '.json')
  const storage = new Client.CookieFileStorage(cookiePath);
  var device = new Client.Device(email);
  var session = new Client.Session(device, storage, proxy);
  session.token = token;
  new Client.AccountEmailCreator(session)
    .setEmail(email)
    .setUsername(username)
    .setPassword(password)
    .setName('')
    .register()
    .spread(function(account, discover) {
      cb(account)
      // console.log("Discovery Feed", discover);
    })
    .catch(function(err) {
      cb(null, err)
    })
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function locFb(proxy, task, cb) {

  // Выполнено: Собираем локации
  renderCustomCompletedView(task._id, 'Ищем локации')

  var lng = task.centroid[0]
  var lat = task.centroid[1]
  var distance = Math.floor(task.distance * 1000)
  var tok = '208737209614557|nZI7t9ZvRjfVkjeBzAaP3juvAyQ'
  ////// 50000

  var locations = 'https://graph.facebook.com/search?type=place&center=' + lat + ',' + lng + '&distance=' + distance + '&limit=100&access_token=' + tok 
  
  // console.log(locations)
  
  var fb;
  var locations_array = [];
  var fb = new Client.Web.fbSearchPlace(proxy, locations);
  var promiseWhile = function(action) {
    return new Promise(function(resolve, reject) { 
      var indicator = 0;
      var func = function(res) { 
        if (res) {
          var jsonRes = JSON.parse(res.body)
          indicator += jsonRes.data.length
          // console.log(indicator)
          renderCustomCompletedView(task._id, 'Локации: ' + indicator)
          jsonRes.data.forEach(function(item) {
            locations_array.push(item.id)
          })
          if (getStateView(task._id) == 'stop' || getStateView(task._id) == 'stopped' || !jsonRes.paging) { 
            return reject(new Error("stop"));  
          }
          // console.log(jsonRes.paging.next)
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
      resolve(fb.get());
    });
  })
  .catch(function (err) {
    console.log(err);
    if (getStateView(task._id) != 'stop' && getStateView(task._id) != 'stopped') {
      cb(locations_array);
    } else {
      cb();
    }
  });
}

function locMedia(task, proxy, location, callback) {

  renderNewTaskCompletedView(task._id)
  var locationReq = new Client.Web.Geolocation(returnProxyFunc(proxy), location, task.max_limit);  
  var promiseWhile = function(action) {
    return new Promise(function(resolve, reject) { 
      var indicator = 0;
      var func = function(res) { 
        if (res) {
          if ( getStateView(task._id) == 'stop' || getStateView(task._id) == 'stopped' || !res.location.media.page_info.end_cursor) {
            return callback();
          }
          var unique = res.location.media.nodes.filter(function(elem, index, self) {
            return index == self.indexOf(elem);
          })
          // Выполнено: current_value + unique.length
          unique.forEach(function(node) {
            appendStringFile(task.output_file, node.owner.id);
            // console.log(node.owner.id) // show on menu
          })
          renderTaskValueCompletedView(task._id, unique.length);

          // console.log(proxy, location, res.location.media.page_info.end_cursor, res.location.media.nodes.length) 
          // appendStringFile(task.output_file, proxy + ' ' + location + ' ' + res.location.media.page_info.end_cursor + ' ' + res.location.media.nodes.length);
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
      resolve(locationReq.get());
    });
  })
  .catch(function (err) {
    if (err instanceof Client.Exceptions.APIError) {
      if (!err instanceof  Client.Exceptions.NotFoundError) {
        console.log(err);
      }
    } else {
      // console.log(err);
    }
   
  });
}


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
      var proxy = returnProxyFunc(proxy_array[0]);

      // task.anonym_profile 
      locFb(proxy, task, function(locations_array) {
        if(!locations_array) {
          setStateView(task._id, 'stopped');
          renderCustomCompletedView(task._id, '-')
          loggerDb(task._id, 'Парсинг по гео остановлен');  
          return;
        }

        var chunked = _.chunk(locations_array, proxy_array.length);
        _.object = function(list, values) {
          if (list == null) return {};
          var result = {};
          for (var i = 0, l = list.length; i < l; i++) {
            if (values) {
              result[list[i]] = values[i];
            } else {
              result[list[i][0]] = list[i][1];
            }
          }
          return result;
        };
        var promiseWhile = function(action) {
          var resolver = Promise.defer();
          var indicator = 0;
          var i = 0;
          var func = function(results) {
            async.mapValues(_.object(chunked[i], proxy_array), function (proxy, location, callback) {
              locMedia(task, proxy, location, callback);
            }, function(err, result) {
              console.log("DONE! stopped");
              setStateView(task._id, 'stopped');
              loggerDb(task._id, 'Парсинг по гео остановлен'); 

              // removeDup(task, task.output_file)  // make it on streams

            });
            i++;
            if(getStateView(task._id) == 'stop' || i > chunked.length - 1) {
              return resolver.resolve(); 
            }
            return Promise.cast(action())
              .then(func)
              .catch(resolver.reject);
          };
          process.nextTick(func);
          return resolver.promise;
        };

        var actionFunc = function() {
          return new Promise(function(resolve, reject) {
            // setTimeout(function() {
            resolve(chunked);
            // }, task.reg_timeout * 1000);
          });
        };
        promiseWhile(actionFunc)
        .then(function() {
          console.log("DONE! logger");
          
          // setStateView(task._id, 'stopped'); ///// ??
        }).catch(function (err) {
          console.log(err);
        });
      })

    });
  })
  .catch(function(err) {
    console.log(err)
  }) 
   
}

/*****************************
 * TASK Filter accounts      *                      
 *****************************/

function filterApi(task, token) { ///////////////////// FIX !!!
  mkdirFolder(logsDir)
  .then(function() {
    setStateView(task._id, 'run');    
    loggerDb(task._id, 'Фильтрация аудитории');
    setCompleteView(task._id, '-');
    fs.truncate(task.outputfile, 0, function() { 
      loggerDb(task._id, 'Файл подготовлен');
    });


    var indicator = 0;
    var filterSuccess = 0;

    fs.readFile(task.proxy_file, 'utf8', function(err, proxy_array) {
      proxy_array = proxy_array.split(EOL).filter(isEmpty).filter(validateProxyString);
      if (err) throw err;
      fs.readFile(task.inputfile, 'utf8', function(err, users_array) {
        users_array = users_array.split(EOL).filter(isEmpty);

        // console.log(proxy_array, users_array)

        var chunked = _.chunk(users_array, proxy_array.length);
        _.object = function(list, values) {
          if (list == null) return {};
          var result = {};
          for (var i = 0, l = list.length; i < l; i++) {
            if (values) {
              result[list[i]] = values[i];
            } else {
              result[list[i][0]] = list[i][1];
            }
          }
          return result;
        };


        var promiseWhile = function(action) {
          var resolver = Promise.defer();
          var indicator = 0;
          var i = 0;
          var func = function(results) {
            async.mapValues(_.object(chunked[i], proxy_array), function (proxy, user, callback) {

              var filterRequest = new Client.Web.Filter(token);   
              filterRequest.getUser(user, returnProxyFunc(proxy))
                .then(function(res) { 
                  filterFunction(res, task, proxy, function(bool) { // proxy fix
                    indicator++;
                    if (bool) {
                      filterSuccess += 1;
                    }
                    // console.log(indicator)
                    renderUserCompletedView(task._id, users_array.length, indicator, filterSuccess); 
                  });

                  callback() 
                })
                .catch(function(err) { 
                  indicator++;       
                  callback(err)
                });

            }, function(err, result) {
              console.log("DONE! stopped");
              setStateView(task._id, 'stopped');
              loggerDb(task._id, 'Фильтрация остановлена'); 
            });
            i++;
            if(getStateView(task._id) == 'stop' || i > chunked.length - 1) {
              return resolver.resolve(); 
            }
            return Promise.cast(action())
              .then(func)
              .catch(resolver.reject);
          };
          process.nextTick(func);
          return resolver.promise;
        };

        var actionFunc = function() {
          return new Promise(function(resolve, reject) {
            resolve();
          });
        };
        promiseWhile(actionFunc)
        .then(function() {
          console.log("DONE! logger");
        }).catch(function (err) {
          console.log(err);
        });



        // console.log(_.object(chunked[0], proxy_array) )
        // console.log(users_array.length, proxy_array.length)

        // var filterRequest = new Client.Web.Filter(token);   
        // var promiseFor = Promise.method(function(condition, action, value) {
        //   if (condition(value))
        //     return value;
        //   return action(value)
        //     .then(promiseFor.bind(null, condition, action));
        // });
        // var condFunc = function(count) {

        //   return count > chunked.length - 1; // getStateView(task._id) == 'stop' || getStateView(task._id) == 'stopped' ||
        // }
        // var actionFunc = function(count) {
        //   console.log(count)
        //   return new Promise((resolve, reject) => {

        //     async.mapValues( _.object(chunked[count], proxy_array), function (proxy, user, callback) {

        //       console.log(proxy, user)
              
        //       filterRequest.getUser(user, returnProxyFunc(proxy))
        //       .then(function(res) { 

        //         filterFunction(res, task,  proxy, function(bool) { // proxy fix
        //           indicator++;
        //           if (bool) {
        //             filterSuccess += 1;
        //           }
        //           console.log(indicator)
        //           renderUserCompletedView(task._id, users_array.length, indicator, filterSuccess); 
        //         });
        //         callback() 
        //       })
        //       .catch(function(err) { 
        //         indicator++;       
        //         callback(err)
        //       });

        //     }, function(err, result) {
        //       console.log("DONE!");
        //       resolve(++count);
        //       // setStateView(task._id, 'stopped');
        //       // loggerDb(task._id, 'Фильтрация остановлена');  
        //     });
            
            
        //   })
          

        // };
        // promiseFor(condFunc, actionFunc, 0)
        // .then(function() {
        //   console.log('done!');
        //   // callback();
        // })
        // .catch(function (err) {
        //   console.log(err)
        //   // if(err.message == 'Cancelled') {
        //   //   // callback(err);
        //   // } else {
        //   //   // callback();
        //   // }
          
        // })


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
    var cookiePath = path.join(cookieDir, user._id + ".json");
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

    // console.log(task.parsed_conc.length)
    var count = 0;
    var penalty = 0;
    task.parsed_conc.forEach(function(conc_user) {
      ses.then(function(session) {
        return [session, Client.Account.searchForUser(session, conc_user)]   
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
          return getStateView(task._id) == 'stop' || getStateView(task._id) == 'stopped' || count >= task.max_limit * task.parsed_conc.length - penalty; // fix for
        }

        var actionFunc = function() {
          return feed.get()
          .then(function(res) { 

            res.forEach(function (item, i , arr) {
              if (count < task.max_limit * task.parsed_conc.length) {
                appendStringFile(task.outputfile, item._params.username);
                renderTaskCompletedView(user._id);
              }
              count++
            });
            if (!feed.getCursor()) {

              penalty += task.max_limit - count
              throw new Error("stop");  
            }
          });
        };

        promiseWhile(condFunc, actionFunc)
          .then(function() {
          setStateView(user._id, 'stopped');
          // console.log('done!');
        })
        .catch(function (err) {
          // console.log(err);
          setStateView(user._id, 'stopped');
        })
      })
      .catch(function (err) {

        // console.log(err)
        setStateView(user._id, 'stopped');
      });
    });
  })
  .catch(function(err) {
    setStateView(user._id, 'stopped');
    console.log(err);
  })
}

/*****************************
 * TASK Create accounts      *                      
 *****************************/
 
function createApi(task, token) {
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
      _.object = function(list, values) {
        if (list == null) return {};
        var result = {};
        for (var i = 0, l = list.length; i < l; i++) {
          if (values) {
            result[list[i]] = values[i];
          } else {
            result[list[i][0]] = list[i][1];
          }
        }
        return result;
      };
      
      // console.log(_.object(chunked[0], proxy_array))
      // console.log(email_array.length, proxy_array.length)

      var promiseWhile = function(action, email_tuple) {
        var resolver = Promise.defer();
        var filterSuccess = 0;
        var i = 0;
        var indicator = 0;
        var func = function(results) {

          async.mapValues( _.object(email_tuple[i], proxy_array), function (proxy, email, callback) {
            var password = generatePassword(); 
            var name = email.split("@")[0];

            // console.log(proxy, email)
            fastCreateAccount(task, email, name, password, returnProxyFunc(proxy), token, function(session, err) {
              indicator++;
              if (err) {
                if (err instanceof Client.Exceptions.APIError) {
                  // console.log(task._id, 'Ошибка при регистрации ' + email + ' ' + proxy + ': ' + err.message)
                  loggerDb(task._id, 'Ошибка при регистрации ' + email + ' ' + proxy + ': ' + err.message);
                } else {
                  console.log(task._id, 'Ошибка при регистрации ' + email + ' ' + proxy + ': ' + err.message)
                  loggerDb(task._id, 'Ошибка при регистрации ' + email + ' ' + proxy + ': ' + err.message);
                }     

                renderUserCompletedView(task._id, email_array.length, indicator, filterSuccess)
                callback();
              }
              
              if (session) {
                filterSuccess += 1;
                console.log(task.output_file, session._params.username + "|" + password + "|" + proxy)
                appendStringFile(task.output_file, session._params.username + "|" + password + "|" + proxy);  //  email + "|" +

                // renderTaskCompletedView(task._id);
                renderUserCompletedView(task._id, email_array.length, indicator, filterSuccess)
                callback();
              }

            });


          }, function(err, result) {
            console.log("DONE!");
          });
          i++;
          if(getStateView(task._id) == 'stop' || i > chunked.length - 1) {
            return resolver.resolve(); 
          }
          return Promise.cast(action(email_tuple))
            .then(func)
            .catch(resolver.reject);
        };
        process.nextTick(func);
        return resolver.promise;

      };

      var actionFunc = function() {
        return new Promise(function(resolve, reject) {
          setTimeout(function() {
            resolve(chunked);
          }, task.reg_timeout * 1000);
        });
      };

      promiseWhile(actionFunc, chunked)
      .catch(function (err) {
        console.log(err);
        setStateView(task._id, 'stopped');
        loggerDb(task._id, 'Регистрация остановлена');  
      }).catch(function (err) {
        console.log(err);
      });

    })
  })
  .catch(function(err) {
    console.log(err);
    setStateView(task._id, 'stopped');
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
        // console.log(err)
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
