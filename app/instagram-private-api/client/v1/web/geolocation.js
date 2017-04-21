var _ = require("underscore");
var errors = require('request-promise/errors');
var Promise = require('bluebird');
var util = require('util');
var iPhoneUserAgent = 'Mozilla/5.0 (Linux; U; Android 4.3; en-us; Google Nexus 4 - 4.3 - API 18 - 768x1280 Build/JLS36G) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30';

var Geolocation = function(proxy, location, max_limit, token) {
    this.token = token

    this.max_limit = max_limit  // add check if
    this.proxy = proxy
    this.locationId = location
    this.cursor = '';
    this.moreAvailable = null;
    this.iteration = 0;
    this.fetched = 0;
}

exports.Geolocation = Geolocation;

Geolocation.prototype.getToken = function() {
    return this.token;
}

Geolocation.prototype.setCursor = function (cursor) {
    this.cursor = cursor;
};

Geolocation.prototype.getCursor = function () {
    return this.cursor;
};


var Exceptions = require('../exceptions');
var Session = require('../session');
var routes = require('../routes');
var CONSTANTS = require('../constants');
var WebRequest = require('./web-request');
var Helpers = require('../../../helpers');
var Exceptions = require("../exceptions");
var ORIGIN = CONSTANTS.HOST.slice(0, -1);  


Geolocation.prototype.get = function () {
    var that = this;
    return new WebRequest( )
        .setToken(that.getToken())
        .setMethod('GET')
        .setResource('geoLocationAnonym', {locationId: that.locationId, maxId: that.getCursor() }) //   userInfoAnonym
        .setJSONEndpoint()
        .setHeaders({
            'Host': CONSTANTS.HOSTNAME,
            'Referer': CONSTANTS.WEBHOST,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*;q=0.8',
            'Accept-Language': 'en-us',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Origin': ORIGIN,
            'Connection': 'keep-alive',
            'User-Agent': iPhoneUserAgent,
        })
        .send({
            followRedirect: true,
            proxy: that.proxy
        })  
        .then(function(response) {
            return new Promise((resolve, reject) => {
                 
                that.fetched += response.location.media.nodes.length
                if (that.fetched >= that.max_limit) {
                    that.setCursor(null);
                } else if (response.location.media.page_info.end_cursor) {
                    that.setCursor(response.location.media.page_info.end_cursor)
                } else {
                    that.setCursor(null);
                }
                resolve(response);
            });
        })
        // .catch(function(err) {
        //     console.log(that.proxy)
        //     console.log(err);
        // });
}

