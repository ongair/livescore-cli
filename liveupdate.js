#!/usr/bin/env node

var program = require('commander'),
    tubet = require('./lib/tubet.js'),
    Match = require('./lib/match.js'),
    moment = require('moment'),
    helper = require('./lib/liveupdate-helpers.js'),
    _ = require('lodash');

var cache = {};

program
    .version('0.0.1')
    .usage('[options]')
    .option('-r, --refresh [seconds]', 'Refresh interval in seconds. Default is 30 seconds.  Should be > 30')
    .option('-d, --debugging', 'debugging')
    .parse(process.argv);

if (program.args.length)
    program.help();


// console.log("Running live updater");

function liveUpdate() {
  tubet.findLiveMatches()
    .then(function(matches){
      matches.forEach(function(game) {
        key = game['gameId'];
        if (!cache[key]) {
          helper.getMatch(game['tracker'])
            .then(function(match) {
              time = moment().format("H.mm");
              status = game['status'];
              _key = match.matchId;
              cache[_key] = [match];
              cache['timestamp'] = new Date();
              console.log(_key, status, match.title, match.score, match.progress);
              // check to see if the status is different...
              if (status == "pending" && match.progress != "NS") {
                // should update that the match has kicked off
                tubet.updateMatchStatus(_key,"live", "*" + match.title + "*\r\n" + time + " Kick off. Score " + match.score)
                  .then(function() {
                    console.log("Updated status of match", status);
                  });
              }
            });
        }
        else {
          // old = cache[game['gameId']];
          newer = helper.getMatch(game['tracker'])
            .then(function(newer) {
              var old = cache[newer.matchId][cache[newer.matchId].length-1];

              tubet.resolveDifferences(old, newer, game.status);            
              console.log(old.progress,newer.progress);

              cache[newer.matchId].push(newer);
            });
        }
      });
    });
}

liveUpdate();
setInterval(function() {
  liveUpdate();
}, program.refresh ? program.refresh * 1000 : 60000);
