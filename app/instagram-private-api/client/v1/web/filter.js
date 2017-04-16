var _ = require("underscore");
var errors = require('request-promise/errors');
var Promise = require('bluebird');
var util = require('util');
var iPhoneUserAgent = 'Mozilla/5.0 (Linux; U; Android 4.3; en-us; Google Nexus 4 - 4.3 - API 18 - 768x1280 Build/JLS36G) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30';
var Filter = function() {}
exports.Filter = Filter;

var Exceptions = require('../exceptions');
var Session = require('../session');
var routes = require('../routes');
var CONSTANTS = require('../constants');
var WebRequest = require('./web-request');
var Helpers = require('../../../helpers');
var Exceptions = require("../exceptions");
var ORIGIN = CONSTANTS.HOST.slice(0, -1); // Trailing / in origin
 

Filter.prototype.media = function (_username, _proxy) {
    return new WebRequest( )
        .setMethod('GET')
        .setResource('mediaInfoAnonym', {username: _username, maxId: ''}) //   userInfoAnonym
        .setJSONEndpoint()
        .setHeaders({
            'Host': CONSTANTS.HOSTNAME,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*;q=0.8',
            'Accept-Language': 'en-us',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Origin': ORIGIN,
            'Connection': 'keep-alive',
            'User-Agent': iPhoneUserAgent,
        })
        .send({
            followRedirect: true,
            proxy: _proxy
        }) // false
        .then(function(response) {
            return new Promise((resolve, reject) => {
                resolve(response);
            });
        }).catch(function(err) {
            console.log(err);
        });
}

Filter.prototype.getUser = function (_username, _proxy) {
    return new WebRequest( )
        .setMethod('GET')
        .setResource('userInfoAnonym', {username: _username}) //   userInfoAnonym
        .setJSONEndpoint()
        .setHeaders({
            'Host': CONSTANTS.HOSTNAME,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*;q=0.8',
            'Accept-Language': 'en-us',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Origin': ORIGIN,
            'Connection': 'keep-alive',
            'User-Agent': iPhoneUserAgent,
           
        })
        .send({
            followRedirect: true,
            proxy: _proxy
        }) // false
        .then(function(response) {
            var json_obj = new Object();
            json_obj.followerCount = response.user.follows.count;
            json_obj.followingCount = response.user.followed_by.count;
            json_obj.mediaCount = response.user.media.count;
            json_obj.isPrivate = response.user.is_private;
            json_obj.fullName = response.user.full_name;
            json_obj.biography = response.user.biography;
            json_obj.username = response.user.username;
            json_obj.id = response.user.id;
            return new Promise((resolve, reject) => {
                resolve(json_obj);
            });
        })

        .catch(function(err) {
            // console.log(err);
            return new Promise((resolve, reject) => {
                err._username = _username;
                reject(err);
            });
            
            
        });
}
 
