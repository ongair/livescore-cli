var request = require('request');
var moment = require('moment');
var tubet = {

  findLiveMatches: function() {
    return new Promise(function(resolve, reject) {
      base_uri = "http://localhost:3000";
      url = base_uri + "/api/v1/admin/matches/live";
      xkey = process.env.xkey;
      xaccesstoken = process.env.xaccesstoken;

      request.get({
        uri: url,
        headers: {
          "Accept": "application/json",
          "x-key": xkey,
          "x-access-token": xaccesstoken
        }
      },
      function(err, httpResponse, body) {
        if (!err && httpResponse.statusCode == 200) {
          resolve(JSON.parse(body));
        } else {
          reject(err);
        }
      });
    });
  },

  updateMatchStatus: function(id, status, message) {
    return new Promise(function(resolve, reject) {
      base_uri = "http://localhost:3000";
      url = base_uri + "/api/v1/admin/matches/" + id;

      console.log("Updating to ", url);

      request.put({
        uri: url,
        headers: _getHeaders(),
        json: {
          status: status,
          message: message
        }
      },
      function(err, httpResponse, body) {
        if (!err && httpResponse.statusCode == 200) {
          resolve(body);
        }
        else {
          reject(err);
        }
      })
    })
  },

  resolveDifferences: function(old, update, status) {
    console.log(update.matchId, status, update.title, update.score, update.progress);
    diff = old.compare(update);
    if (diff) {
      console.log(update.matchId, "Diff", diff.type, update.title, update.score, old.score, old.matchId, diff.isStatusChange(), diff.isScore());
      if (diff.isStatusChange() || diff.isScore()) {
        diff.send();
      }
    }
  }
}

function _getHeaders() {
  xkey = process.env.xkey;
  xaccesstoken = process.env.xaccesstoken;

  return {
    "Accept": "application/json",
    "x-key": xkey,
    "x-access-token": xaccesstoken
  }
}



module.exports = tubet;
