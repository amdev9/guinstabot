var util = require("util");
var _ = require("underscore");
var fs = require("fs");
var concat = require('concat-stream')

var Request = require('../request');
var routes = require('../routes');
var Helpers = require('../../../helpers');
var camelize = require('underscore.string/camelize');
var CONSTANTS = require('../constants');


function WebRequest() {
    Request.apply(this, arguments);
    this._request.headers = _.extend(_.clone(this._request.headers), {
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
    });
    this._jsonEndpoint = false;
    delete this._request.headers['X-IG-Connection-Type'];
    delete this._request.headers['X-IG-Capabilities'];
}

util.inherits(WebRequest, Request);

module.exports = WebRequest;
var Exceptions = require('../exceptions');
var Session = require('../session');
var Device = require('../device');


WebRequest.prototype.setResource = function(resource, data) {
    this._resource = resource;
    // console.log(routes.getWebUrl(resource, data)); ///////////// url debug
    this.setUrl(routes.getWebUrl(resource, data));
    return this;
};


WebRequest.prototype.setDevice = function(device) {
    if(!(device instanceof Device))
        throw new Error("`device` parametr must be instance of `Device`") 
    this._device = device;
    this.setHeaders({
        'User-Agent': device.userAgent()
    });
    return this;
};


WebRequest.prototype.setJSONEndpoint = function(json) {
    this.setOptions({
        qs: {'__a': '1'}
    })
    this._jsonEndpoint = true;
    return this;
};



WebRequest.prototype.setCSRFToken = function(token) {
    this.setHeaders({
        'x-csrftoken': token
    });
    return this;
};


WebRequest.prototype.setHost = function(host) {
    if(!host) host = CONSTANTS.WEB_HOSTNAME;
    this.setHeaders({
        'Host': host,
    });
    return this;
};


WebRequest.prototype.setToken = function(token) {
    this.token = token;
    return this;
}


WebRequest.prototype.send = function (options) {
    // console.log('web send')
    var that = this;
    return this._mergeOptions(options)
        .then(function(opts) {
            return [opts, that._prepareData()];    
        })
        .spread(function(opts, data){
            opts = _.defaults(opts, data);
            return that._transform(opts);
        })
        .then(function(opts) { 
            options = opts;

            return new Promise(function(resolve, reject) {
              var xhr = Request.requestClient(options)
              var res;
              var body = concat(function(data) {
                res.body = data.toString();
                if (res.statusCode == 200 ) {
                    resolve([res, options]);
                } else {
                    reject(res)
                }
              })
              
              xhr.on('response', function(response) {
                res = response;
              }).on('data', function(chunk) {
                body.write(chunk);
              }).on('end', function() {
                body.end()
              }).catch(function(err) {
              })
              .then(function(res) {

              });
            
            // console.log(that.getToken())

              if (that.getToken()) {          
                that.getToken().cancel = function() { 
                  xhr.abort();
                  return reject(new Error("Cancelled"));
                };
              }
            })

            // return [Request.requestClient(options), options]
        })
        .spread(function(response, options) {
            if(that._jsonEndpoint) {
                var beforeParse = _.bind(that.beforeParse, that)
                var parseMiddleware = _.bind(that.parseMiddleware, that)
                return new Promise(function(resolve, reject) {
                    return resolve(beforeParse(response))
                })
                .then(parseMiddleware);          
            }
            return response;
        })
        .then(function(response) {
            if(that._jsonEndpoint) return response.body;
            return response;
        })
        .catch(function(error) {
            return that.beforeError(error, options, 0)
        })
        .catch(function (err) {

            if(err.message == 'Cancelled') {
                throw new Exceptions.RequestCancel();
            }

            if(!err || !err.response)
                throw err;    
            var response = err.response;
            if (response.statusCode == 404)
                throw new Exceptions.NotFoundError(response);
            throw err;
        })
        .catch(function(error) {
            return that.afterError(error, options, 0)
        })
}
