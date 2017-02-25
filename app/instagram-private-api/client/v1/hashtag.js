var util = require("util");
var _ = require("underscore");
var Resource = require("./resource");


function Hashtag(session, params) { 
    Resource.apply(this, arguments);
}

util.inherits(Hashtag, Resource);
module.exports = Hashtag;

var Request = require('./request');
var Helpers = require('../../helpers');


Hashtag.prototype.parseParams = function (json) {
  var hash = {};
  hash.mediaCount = parseInt(json.media_count);
  hash.name = json.name;
  hash.id = json.id;
  if(_.isObject(hash.id))
    hash.id = hash.id.toString();
  return hash;
};


Hashtag.search = function (session, query) {
    return session.getAccountId()
        .then(function(id) {
            var rankToken = Helpers.buildRankToken(id);
            return new Request(session)
                .setMethod('GET')
                .setResource('hashtagsSearch', {
                    query: query,
                    rankToken: rankToken
                })
                .send();
        })
        .then(function(data) {
            return _.map(data.results, function (hashtag) {
                return new Hashtag(session, hashtag);
            });
        });
};