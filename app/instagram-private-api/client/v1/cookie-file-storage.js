var util = require("util");
// var FileCookieStore = require('tough-cookie-filestore');


var tough = require('tough-cookie');
var Store = tough.Store;
var permuteDomain = tough.permuteDomain;
var permutePath = tough.permutePath;
var util = require('util');
var fs = require('fs');
//////////////////////////////////////

var path = require('path');
var fs = require('fs');
var _ = require('underscore');
var Helpers = require('../../helpers');
var CookieStorage = require('./cookie-storage');




function CookieFileStorage(cookiePath) {

    cookiePath = path.resolve(cookiePath);
    Helpers.ensureExistenceOfJSONFilePath(cookiePath);
    CookieStorage.call(this, new PouchDBCookieStore(cookiePath))
}

util.inherits(CookieFileStorage, CookieStorage);
module.exports = CookieFileStorage;


CookieFileStorage.prototype.destroy = function(){
    fs.unlinkSync(this.storage.filePath);
}


/////////////////////////////////



function PouchDBCookieStore(filePath) {
    Store.call(this);
    this.idx = {}; // idx is memory cache
    this.filePath = filePath;
    var self = this;
    
    loadFromDb(this.filePath, function(dataJson) {
        if(dataJson) {
            console.log(dataJson);
            self.idx = dataJson;
        }

    })
}


util.inherits(PouchDBCookieStore, Store);

var PouchDBCookieStore = PouchDBCookieStore;

PouchDBCookieStore.prototype.idx = null;
PouchDBCookieStore.prototype.synchronous = true;

// force a default depth:
PouchDBCookieStore.prototype.inspect = function() {
    return "{ idx: "+util.inspect(this.idx, false, 2)+' }';
};

PouchDBCookieStore.prototype.findCookie = function(domain, path, key, cb) {
    if (!this.idx[domain]) {
        return cb(null,undefined);
    }
    if (!this.idx[domain][path]) {
        return cb(null,undefined);
    }
    return cb(null,this.idx[domain][path][key]||null);
};

PouchDBCookieStore.prototype.findCookies = function(domain, path, cb) {

    // console.log('findCookies');

    var results = [];
    if (!domain) {
        return cb(null,[]);
    }

    var pathMatcher;
    if (!path) {
        // null or '/' means "all paths"
        pathMatcher = function matchAll(domainIndex) {
            for (var curPath in domainIndex) {
                var pathIndex = domainIndex[curPath];
                for (var key in pathIndex) {
                    results.push(pathIndex[key]);
                }
            }
        };

    } else if (path === '/') {
        pathMatcher = function matchSlash(domainIndex) {
            var pathIndex = domainIndex['/'];
            if (!pathIndex) {
                return;
            }
            for (var key in pathIndex) {
                results.push(pathIndex[key]);
            }
        };

    } else {
        var paths = permutePath(path) || [path];
        pathMatcher = function matchRFC(domainIndex) {
            paths.forEach(function(curPath) {
                var pathIndex = domainIndex[curPath];
                if (!pathIndex) {
                    return;
                }
                for (var key in pathIndex) {
                    results.push(pathIndex[key]);
                }
            });
        };
    }

    var domains = permuteDomain(domain) || [domain];
    var idx = this.idx;
    domains.forEach(function(curDomain) {
        var domainIndex = idx[curDomain];
        if (!domainIndex) {
            return;
        }
        pathMatcher(domainIndex);
    });

    cb(null,results);
};

PouchDBCookieStore.prototype.putCookie = function(cookie, cb) {

    if (!this.idx[cookie.domain]) {
        this.idx[cookie.domain] = {};
    }
    if (!this.idx[cookie.domain][cookie.path]) {
        this.idx[cookie.domain][cookie.path] = {};
    }
    this.idx[cookie.domain][cookie.path][cookie.key] = cookie;
    saveToDb(this.filePath, this.idx, function() {
        cb(null);
    });
};

PouchDBCookieStore.prototype.updateCookie = function updateCookie(oldCookie, newCookie, cb) {

    // updateCookie() may avoid updating cookies that are identical.  For example,
    // lastAccessed may not be important to some stores and an equality
    // comparison could exclude that field.
    this.putCookie(newCookie,cb);
};

PouchDBCookieStore.prototype.removeCookie = function removeCookie(domain, path, key, cb) {
    if (this.idx[domain] && this.idx[domain][path] && this.idx[domain][path][key]) {
        delete this.idx[domain][path][key];
    }
    saveToDb(this.filePath, this.idx, function() {
        cb(null);
    });
};

PouchDBCookieStore.prototype.removeCookies = function removeCookies(domain, path, cb) {
    if (this.idx[domain]) {
        if (path) {
            delete this.idx[domain][path];
        } else {
            delete this.idx[domain];
        }
    }
    saveToDb(this.filePath, this.idx, function() {
        return cb(null);
    });
};


function saveToDb(user_id, data, cb) {
    
    // console.log("saveToDb");
    // db.get(user_id).then(function(user) {

    //     return db.put({
    //         _id: user._id,
    //         username: user.username, 
    //         proxy: user.proxy,
    //         password: user.password,
    //         status: user.status,
    //         type: user.type,
    //         cookie: JSON.stringify(data),
    //         task: user.task,
    //         _rev: user._rev  
    //     });
        

    // }).then(function (result) {
    //      console.log(result);
    // }).catch(function (err) {
    //   console.log(err);
    // });

    fs.writeFile(user_id, JSON.stringify(data), function (err) {
        if (err) throw err;
        cb();
    });
}

function loadFromDb(user_id, cb) {

    var data = fs.readFileSync(user_id, 'utf8');
        var dataJson = data ? JSON.parse(data) : null;
        for(var domainName in dataJson) {
            for(var pathName in dataJson[domainName]) {
                for(var cookieName in dataJson[domainName][pathName]) {
                    dataJson[domainName][pathName][cookieName] = tough.fromJSON(JSON.stringify(dataJson[domainName][pathName][cookieName]));
                }
            }
        }
cb(dataJson);

    // db.get(user_id).then(function(doc) {
      
    //     var data = doc.cookie;
    //     var dataJson = data ? JSON.parse(data) : null;
    //     for(var domainName in dataJson) {
    //         for(var pathName in dataJson[domainName]) {
    //             for(var cookieName in dataJson[domainName][pathName]) {
    //                 dataJson[domainName][pathName][cookieName] = tough.fromJSON(JSON.stringify(dataJson[domainName][pathName][cookieName]));
    //             }
    //         }
    //     }
    //     cb(dataJson);

    // }).then(function (result) {
    //   // handle result
    // }).catch(function (err) {
    //   console.log(err);
    // });
}
