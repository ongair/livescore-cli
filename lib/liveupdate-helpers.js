var crypto = require('./crypt-util'),
    _ = require('lodash'),
    request = require('request'),
    moment = require('moment'),
    Match = require('./match.js');

var exports = module.exports = {};

function getMatch(url) {
  return new Promise(function(resolve, reject) {
    var tz = new Date().getTimezoneOffset() / 60 * -1;

    request.get({
      uri: url+ tz +'&tzout=' + tz,
      headers: {
        "Accept": "text/plain",
        "Accept-Language": "en-US,en",
        "Content-Type":"application/text; charset=utf-8",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36"
        }
      },
      function(err, httpResponse, body) {
        if (!err && httpResponse.statusCode == 200) {
          var decrypted = crypto.decrypt(body);
          var result = JSON.parse(decrypted);
          var match = new Match(result);

          resolve(match);
        }
        else {
          reject(err);
        }
      }
    );
  })
}

exports.getMatch = getMatch;
