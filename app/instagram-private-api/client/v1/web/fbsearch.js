var _ = require("underscore");
var errors = require('request-promise/errors');
var Promise = require('bluebird');
var util = require('util');
var iPhoneUserAgent = 'Mozilla/5.0 (Linux; U; Android 4.3; en-us; Google Nexus 4 - 4.3 - API 18 - 768x1280 Build/JLS36G) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30';

var fbSearchPlace = function(proxy, url, token) {
    this.token = token

    this.proxy = proxy;
    this.url = url;
    this.cursor = '';
    this.moreAvailable = null;
    this.iteration = 0;
}

exports.fbSearchPlace = fbSearchPlace;

fbSearchPlace.prototype.getToken = function() {
    return this.token;
}

fbSearchPlace.prototype.setCursor = function (cursor) {
    this.cursor = cursor;
};

fbSearchPlace.prototype.getCursor = function () {
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


fbSearchPlace.prototype.get = function () { 
    var that = this;
    if (that.getCursor()) {
        that.url = that.getCursor()
    }
    return new WebRequest( )
        .setMethod('GET')
        .setUrlFb(that.url) 
        .setHeaders({
            'Host': 'graph.facebook.com',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*;q=0.8',
            'Connection': 'keep-alive',
            'User-Agent': iPhoneUserAgent,
        })
        .send({
            followRedirect: true,
            proxy: that.proxy
        }) 
        .then(function(response) {
            return new Promise((resolve, reject) => {
                var jsonRes = JSON.parse(response.body)
                if (jsonRes.paging && jsonRes.paging.next) {
                    that.setCursor(jsonRes.paging.next)
                } else {
                    that.setCursor(null)
                }
                resolve(response);
            });
        }).catch(function(err) {
            console.log(err);
        });
}


