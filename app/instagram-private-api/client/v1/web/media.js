var _ = require("underscore");
var errors = require('request-promise/errors');
var Promise = require('bluebird');
var util = require('util');
var iPhoneUserAgent = 'Mozilla/5.0 (Linux; U; Android 4.3; en-us; Google Nexus 4 - 4.3 - API 18 - 768x1280 Build/JLS36G) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30';

var Media = function(token) {
    this.token = token
}
exports.Media = Media;

Media.prototype.getToken = function() {
    return this.token;
}

var Exceptions = require('../exceptions');
var Session = require('../session');
var routes = require('../routes');
var CONSTANTS = require('../constants');
var WebRequest = require('./web-request');
var Helpers = require('../../../helpers');
var Exceptions = require("../exceptions");
var ORIGIN = CONSTANTS.HOST.slice(0, -1); // Trailing / in origin
 
 
Media.prototype.get = function (mediaId, _proxy) {
    var that = this;

    return new WebRequest( )
        .setToken(that.getToken())
        .setMethod('GET')
        .setResource('mediaPost', {mediaId: mediaId}) 
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
                resolve(response.graphql.shortcode_media.owner);
            });
        })

        .catch(function(err) {
            return new Promise((resolve, reject) => {
                reject(err);
            });
            
            
        });
}
 
