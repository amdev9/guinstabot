//////////////////////////////////
///////////// API ////////////////
//////////////////////////////////

'use strict';

const Client = require('./instagram-private-api').V1; 
var fs = require('fs');
var path = require('path')
var Promise = require('bluebird');
var async = require('async');
var config = require('./config/default');
var softname = config.App.softname;

var cookieDir = path.join(os.tmpdir(), softname.replace(/\s/g,'') , 'cookie');

function mediaFilter(json, task, proxy, cb) {
  if (json.isBusiness) {
    mediaSessionFilter(json, task, cb);
  } else {
    mediaNoSessionFilter(json, task, proxy, cb);
  }
}

function mediaNoSessionFilter(json, task, proxy, cb) {
  var filterRequest = new Client.Web.Filter();
  filterRequest.media(json.username, proxy).then(function(response) {
    appendStringFile(task.outputfile, json.username);
    cb();
  });
}

function mediaSessionFilter(json, task, cb) {
  var feed = new Client.Feed.UserMedia(session, json.id);
  var p = new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(feed.get())
    }, 2000);
  });
  p = p.then(function(results) {
    if (new Date(results[0]._params.takenAt) >= new Date(task.lastdate + ' 00:00:00')) {
      // console.log (results[0]._params.takenAt);  
      // console.log("not private && data checked")
      appendStringFile(task.outputfile, json.username);
      cb(true);
    }
  }).catch(error => {
    console.log(error);
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
      var words = f.toString().split('\n').filter(isEmpty);
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

var apiFilterNoSession = function(task, token) {
  mkdirFolder(logsDir)
  .then(function() {
  
    setStateView(task._id, 'run');
    renderNewTaskCompletedView(task._id);
    loggerDb(task._id, 'Фильтрация аудитории');
    fs.truncate(task.outputfile, 0, function() { 
      loggerDb(task._id, 'Файл подготовлен');
    });
     Client.Request.setToken(token)
    async.forEach(task.partitions, function (taskpart, callback) {
  
      console.log(taskpart.proxy_parc);
      
      var filterRequest = new Client.Web.Filter();   
      var iterator = taskpart.start;
      var promiseWhile = function( action) {
        return new Promise(function(resolve, reject) {
          var func = function(json) {
            if (json) {
              filterFunction(json, task, taskpart.proxy_parc, function() {
                renderTaskCompletedView(task._id);
              });
            }

            if (getStateView(task._id) == 'stop' || getStateView(task._id) == 'stopped' || iterator >= taskpart.end ) {  
              return reject(new Error("stop"));
            } 
            return Promise.resolve(action())
              .then(func)
              .catch(function() {
                reject()
              });
          };
          process.nextTick(func);
        })
      }

      promiseWhile(function() {
        return new Promise(function(resolve, reject) {
          setTimeout(function() {
            resolve(filterRequest.getUser( task.input_array[iterator], returnProxyFunc(taskpart.proxy_parc) )); // FIX pass param 
            iterator++;
          }, 20);
        });
      }).then(function() {
        callback();
      }).catch(function (err) {
        if (err.message == 'stop') {
          loggerDb(task._id, 'Фильтрация остановлена');
          setStateView(task._id, 'stopped');
          callback();
        } else {
          console.log(err.message);
        }
      });
     }, function(err) {
      console.log(err);
        console.log('iterating done');
    }); 
  })
  .catch(function(err) {
    console.log(err);
  })
}

function filterSessionUser(user_id, ses, task, userFilter, proxy, cb) {
  ses
  .then(function(session) {
    if(session) {
      updateUserStatusDb(user_id, 'Активен');
    }
    return new Promise((resolve, reject) => {
      resolve([session, Client.Account.searchForUser(session, userFilter)]);
    });
  }).all()
  .then(function([session, account]) {
    Client.Account.getById(session, account.id)
      .then(function(account) {
        filterFunction(account.params, task, proxy, cb);
        // if (task.anonym_profile == true) {
        //   var hasAnonymousProfilePictureCond = !account.params.hasAnonymousProfilePicture;
        // } else {
        //   var hasAnonymousProfilePictureCond = true;
        // }
      })
      .catch(function (err) {
        if (err instanceof Client.Exceptions.APIError) {
          console.log(err);
          loggerDb(user_id, err.name);
        } else {
          loggerDb(user_id, 'Ошибка');
          console.log(err);
        }
      });
  })
  .catch(function (err) {
    if (err instanceof Client.Exceptions.APIError) {
      loggerDb(user_id, err.name);
    } else {
      loggerDb(user_id, 'Ошибка');
      console.log(err);
    }
  });
}

function apiFilterAccounts(row, token) {
  if (row.type == 'user') {
    apiFilterSession(row, row.task, token);
  } else if(row.type == 'task') {
    apiFilterNoSession(row, token);
  }
}

var apiFilterSession = function(user, task, token) {
  mkdirFolder(logsDir)
  .then(function() {

    setStateView(user._id, 'run');
    loggerDb(user._id, 'Фильтрация аудитории');
    ////////FIX
    fs.truncate(task.outputfile, 0, function(){ 
      loggerDb(user._id, 'Файл подготовлен'); 
    });

    const device = new Client.Device(user.username);
    var cookiePath = path.join(cookieDir, user._id + ".json");
    const storage = new Client.CookieFileStorage(cookiePath);
    Client.Request.setToken(token)
    var ses = Client.Session.create(device, storage, user.username, user.password, returnProxyFunc(user.proxy));

    var iterator = 1;
    var filterSuccess = 0;
    var promiseWhile = function(action) {
      return new Promise(function(resolve, reject) {
        var func = function(iterator) {
          if (iterator) {
            filterSessionUser(user._id, ses, task, task.input_array[iterator], returnProxyFunc(user.proxy), function(success) {
              if(success) {
                filterSuccess += 1;
              }
              renderUserCompletedView(user._id, task.input_array.length, iterator, filterSuccess); 
            });
          }
          if (getStateView(user._id) == 'stop' || getStateView(user._id) == 'stopped' || iterator >= task.input_array.length) { 
            return reject(new Error("stop"));
          }
          return Promise.resolve(action())
            .then(func)
            .catch(function() {
              reject();
            });
        }
        process.nextTick(func)
      })
    }
    promiseWhile(function() {
      return new Promise(function(resolve, reject) {
        setTimeout(function() {
          resolve(iterator);
          iterator++;
        }, 3000);
      });
    }).catch(function (err) {
      if(err.message == 'stop') {
        loggerDb(user._id, 'Фильтрация остановлена');
        setStateView(user._id, 'stopped');
      } else {
        console.log(err.message);
      }
    });
  })
  .catch(function(err) {
    setStateView(user_id, 'stopped');
    console.log(err);
  })
}

function apiParseAccounts(user, task, token) {
  mkdirFolder(cookieDir)
  .then(function() {
    setStateView(user._id, 'run');
    renderNewTaskCompletedView(user._id);
    loggerDb(user._id, 'Парсинг аудитории');
    //////FIX
    fs.truncate(task.outputfile, 0, function() { 
      loggerDb(user._id, 'Файл подготовлен'); 
    });
    var indicator = 0;

    const device = new Client.Device(user.username);
    var cookiePath = path.join(cookieDir, user._id + ".json");
    const storage = new Client.CookieFileStorage(cookiePath);
    Client.Request.setToken(token)
    var ses = Client.Session.create(device, storage, user.username, user.password, returnProxyFunc(user.proxy));

    task.parsed_conc.forEach(function(conc_user) {
      ses.then(function(session) {
        if(session) {
          updateUserStatusDb(user._id, 'Активен');
        }
        return [session, Client.Account.searchForUser(session, conc_user)]   
      }).all()
      .then(function([session, account]) {
        var feed;
        if (task.parse_type == true) {
          feed = new Client.Feed.AccountFollowers(session, account.id);
        } else {
          feed = new Client.Feed.AccountFollowing(session, account.id);
        }
        
        var promiseWhile = function(action) {
          return new Promise(function(resolve, reject) { 
            var indicator = 0;
            var func = function(results) { 
              if (results) {
                results.forEach(function (item, i , arr) {
                  if (indicator < task.max_limit * task.parsed_conc.length) {
                    appendStringFile(task.outputfile, item._params.username);
                    renderTaskCompletedView(user._id);
                  }
                  indicator++;
                });
              }
              if (getStateView(user._id) == 'stop' || getStateView(user._id) == 'stopped'  ||  indicator > task.max_limit * task.parsed_conc.length) {
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
            resolve(feed.get());
          });
        })
        .catch(function (err) {

          setStateView(user._id, 'stopped');
          if (err instanceof Client.Exceptions.APIError) {
            if(err.ui) {
              updateUserStatusDb(user._id, err.ui); 
            } else if (err.name == 'RequestCancel') {
              
            } else {
              updateUserStatusDb(user._id, err.name);
            }
          } else if (err.message == 'stop') {

          } else {
            updateUserStatusDb(user._id, 'Произошла ошибка');
            console.log(err);
          }

          // console.log(err);
          // if(err.message == 'stop') {
          //   loggerDb(user._id, 'Парсинг остановлен');
          //   setStateView(user._id, 'stopped');
          // } else {
          //   console.log(err.message);
          // }
        });
      })
      .catch(function (err) {

        console.log(2, err)
        setStateView(user._id, 'stopped');
        if (err instanceof Client.Exceptions.APIError) {
          if(err.ui) {
            updateUserStatusDb(user._id, err.ui); 
          } else if (err.name == 'RequestCancel') {

          }
          else {
            updateUserStatusDb(user._id, err.name);
          }
          // console.log(err);
        } else {
          updateUserStatusDb(user._id, 'Произошла ошибка');
          console.log(err);
        }

      });
    });
  })
  .catch(function(err) {
    setStateView(user_id, 'stopped');
    console.log(err);
  })
}

function fastCreateAccount(task, email, username, password, proxy, cb) {

  var cookiePath = path.join(cookieDir, email + '.json')
  const storage = new Client.CookieFileStorage(cookiePath);
  var device = new Client.Device(email);
  var session = new Client.Session(device, storage, proxy);
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
      if (err instanceof Client.Exceptions.APIError) {
        loggerDb(task._id, 'Ошибка при регистрации ' + email + ' ' + proxy + ': ' + err.message);
      } else {
        loggerDb(task._id, 'Ошибка при регистрации ' + email + ' ' + proxy + ': ' + err.message);
      }     
    })
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function apiCreateAccounts(task, token) {
  mkdirFolder(logsDir)
  .then(function() {
    setStateView(task._id, 'run');
    loggerDb(task._id, 'Регистрация аккаунтов');
    setCompleteView(task._id, 0);
    Client.Request.setToken(token)
    const NAMES = require('./config/names').names;
    const SURNAMES = require('./config/names').surnames;

    var proxy_array = fs.readFileSync(task.proxy_file, 'utf8')  
    proxy_array = proxy_array.replace(/ /g, "").split(/\r\n|\r|\n/).filter(isEmpty).filter(validateProxyString);
    // var proxy_array = fs.readFileSync(task.proxy_file, 'utf8').split('\n').filter(isEmpty).filter(validateProxyString); // check

    var email_array = [];
    if (!task.own_emails) {
      for(var i = 0; i < task.emails_cnt; i++) {
        var name = SURNAMES[Math.floor(Math.random() * SURNAMES.length)] + NAMES[Math.floor(Math.random() * SURNAMES.length)];
        email_array.push(name + getRandomInt(1000, 99999) + '@gmail.com');
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
    
    var promiseWhile = function( action, email_tuple) {
      var resolver = Promise.defer();
      var indicator = 0;
      var i = 0;
      var func = function(results) {
        async.mapValues(_.object(email_tuple[i], proxy_array), function (proxy, email, callback) {
          var password = generatePassword(); 
          var name = email.split("@")[0];
          fastCreateAccount(task, email, name, password, returnProxyFunc(proxy), function(session) {
            appendStringFile(task.output_file, session._params.username + "|" + password + "|" + proxy);  //  email + "|" +
            renderTaskCompletedView(task._id);
            callback();
          });
        }, function(err, result) {
          console.log("DONE!");
        });
        i++;
        if(getStateView(task._id) == 'stop' || i > email_tuple.length - 1) {
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
      .then(function() {
        setStateView(task._id, 'stopped');
        loggerDb(task._id, 'Регистрация остановлена');  
      }).catch(function (err) {
        console.log(err);
      });
  })
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
          renderCustomCompletedView(task._id, 'Найдено локаций: ' + indicator)
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
      console.log(err);
    }
   
  });
}


function removeDup(task, filepath) {
  renderCustomCompletedView(task._id, 'Удаляем дубликаты')
  fs.readFile(filepath, 'utf8', (err, data) => {
    if (err) throw err;
    var unique = data.replace(/ /g, "").split(/\r\n|\r|\n/).filter(function(elem, index, self) {
      return index == self.indexOf(elem);
    })
    fs.truncate(filepath, 0, () => {
      unique.forEach(function(str, i) {
        appendStringFile(filepath, str);
        if (i == unique.length - 1 ) {
          renderCustomCompletedView(task._id, unique.length)
          console.log('REMOVED duplicates')
        }
      })
    })
  });
}


function apiParseGeoAccounts(task, token) {
  mkdirFolder(logsDir)
    .then(function() {
      setStateView(task._id, 'run');
      loggerDb(task._id, 'Парсинг по гео');
      
      var proxy_array = fs.readFileSync(task.proxy_file, 'utf8')  
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
        var promiseWhile = function(action, location_tuple) {
          var resolver = Promise.defer();
          var indicator = 0;
          var i = 0;
          var func = function(results) {
            async.mapValues(_.object(location_tuple[i], proxy_array), function (proxy, location, callback) {
              locMedia(task, proxy, location, callback);
            }, function(err, result) {
              console.log("DONE! stopped");
              setStateView(task._id, 'stopped');
              loggerDb(task._id, 'Парсинг по гео остановлен'); 

              // removeDup(task, task.output_file)  // make it on streams

            });
            i++;
            if(getStateView(task._id) == 'stop' || i > location_tuple.length - 1) {
              return resolver.resolve(); 
            }
            return Promise.cast(action(location_tuple))
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
        promiseWhile(actionFunc, chunked)
          .then(function() {
            console.log("DONE! logger");
            
            // setStateView(task._id, 'stopped'); ///// ??
          }).catch(function (err) {
            console.log(err);
          });
        })
      }) 
   
}

function apiSessionCheck(user_id, username, password, proxy, token) {
  mkdirFolder(cookieDir)
  .then(function() {
   
    setStateView(user_id, 'run');
    loggerDb(user_id, 'Выполняется логин');
    var device = new Client.Device(username);
    var cookiePath = path.join(cookieDir, username + ".json");
    var storage = new Client.CookieFileStorage(cookiePath);
    var session = new Client.Session(device, storage);
    if(_.isString(proxy) && !_.isEmpty(proxy)) {
      session.proxyUrl = returnProxyFunc(proxy);
    }
    Client.Request.setToken(token)
    Client.Session.login(session, username, password)
      .then(function(session) {
        updateUserStatusDb(user_id, 'Активен');
        setStateView(user_id, 'stopped');
      })
      // .catch(function(error) {
      //   console.log(error)
      // })

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
          // console.log(err);
        } else {
          updateUserStatusDb(user_id, 'Произошла ошибка');
          console.log(err);
        }
      });
  })

}
