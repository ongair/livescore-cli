var moment = require('moment');
var tubet = require('./tubet.js');

Array.prototype.diff = function(a) {
  return this.filter(function(i) {return a.indexOf(i) < 0;});
};


function Team(data) {
  this.id = data['ID'];
  this.name = data['Nm'];
}

function Player(data) {
  this.id = data['Pid'];
  this.name = this.getName(data["Fn"], data['Ln'], data["Nm"]);
}

Player.prototype.getName = function(firstName, lastName, otherName) {
  if (otherName)
    return otherName;
  else if (firstName && lastName) {
    return firstName + " " + lastName;
  }
}

function Substitution(data, match) {
  this.minute = data["Min"];
  this.team = data["Nm"];
  this.off = match.findPlayer(data["ID"]).name;
  this.on = match.findPlayer(data["IDo"]).name;
}

Substitution.prototype.getDescription = function() {
  return this.off + " is substituted for " + this.on;
}

function Event(data, match) {
  this.minute = data["Min"];
  this.team = data["Nm"];
  this.incidentType = data["IT"];

  this.subIncident = data["Incs"];

  if (this.subIncident) {
    this.incidentType = this.subIncident[0]["IT"];
    this.eventType = _getEventType(this.incidentType);
    this.playerId = this.subIncident[0]["ID"];

    this.assist = this.subIncident[1]["ID"];
  }
  else {
    this.eventType = _getEventType(this.incidentType);
    this.playerId = data["ID"];
  }
  this.player = match.findPlayer(this.playerId);
  if (!this.player) {
    this.player = { name: "Unknown" };
  }
  this.description = this.getDescription();
}

Event.prototype.isGoal = function() {
  return this.incidentType == 36;
}

Event.prototype.isYellow = function() {
  return this.incidentType == 43;
}

Event.prototype.isSecondYellow = function() {
  return this.incidentType == 44;
}

Event.prototype.isRed = function() {
  return this.incidentType == 45;
}

Event.prototype.isPenaltyGoal = function() {
  return this.incidentType == 37;
}

Event.prototype.isOwnGoal = function() {
  return this.incidentType == 39;
}

Event.prototype.getDescription = function() {
  if (this.incidentType) {
    switch (this.incidentType) {
      case 43:
        return this.minute + "' - Yellow card for " + this.player.name;
        break;
      case 44:
        return this.minute + "' - Red card after second yellow for " + this.player.name;
        break;
      case 45:
        return this.minute + "' - Straight red card for " + this.player.name;
        break;
      case 36:
        return this.minute + "' - Goal " + this.player.name;
        break;
      case 37:
        return this.minute + "' - Penalty scored by " + this.player.name;
        break;
      case 39:
        return this.minute + "' - Own-goal by " + this.player.name;
        break;
      default:

    }
  }
}

function Match(raw) {
  this.matchId = raw["Eid"];
  this.progress = raw["Eps"];
  this.venue = raw["Vnm"];
  this.homeTeam = new Team(raw["T1"][0]);
  this.awayTeam = new Team(raw["T2"][0]);
  this.title = this.homeTeam.name + " v " + this.awayTeam.name;
  this.kickOff = _parseDate(raw["Esd"].toString());
  this.homeTeamScore = raw["Tr1"] ? raw["Tr1"] : 0;
  this.homeHTScore = raw["Trh1"];
  this.awayTeamScore = raw["Tr2"] ? raw["Tr2"] : 0;
  this.awayHTScore = raw["Trh2"];
  this.htScore = this.homeHTScore + "-" + this.awayHTScore;
  this.score = this.homeTeamScore + "-" + this.awayTeamScore;
  this.events = [];
  this.players = [];
  var self = this;

  if (raw["Prns"])
    this.players = raw["Prns"].map(function(playerData) {
      return new Player(playerData);
    });

  if (raw["Incs"]) {
    var firstHalfIncidents = raw['Incs']['1'];
    var secondHalfIncidents = raw['Incs']['2'];

    if (!firstHalfIncidents)
      firstHalfIncidents = [];

    if (!secondHalfIncidents)
      secondHalfIncidents = [];

    var incidents = firstHalfIncidents.concat(secondHalfIncidents);

    this.events = incidents.map(function(incident) {
      return new Event(incident, self);
    });
  }


  var subs = raw["Subs"];
  if (subs) {
    var firstHalfSubs = subs['1'];
    var secondHalfSubs = subs['2'];

    if (!firstHalfSubs)
      firstHalfSubs = [];

    if (!secondHalfSubs)
      secondHalfSubs = [];

    subs = firstHalfSubs.concat(secondHalfSubs);
    subs = subs.filter(function(sub) {
      return sub['IT'] == 4;
    });

    this.substitutions = subs.map(function(sub) {
      return new Substitution(sub, self);
    });
  }
}

Match.prototype.winner = function() {
  if (this.homeTeamScore > this.awayTeamScore) {
    return this.homeTeam;
  }
  else if (this.awayTeamScore > this.homeTeamScore) {
    return this.awayTeam;
  }
  else {
    return null;
  }
}

Match.prototype.goals = function() {
  return this.events.filter(function(event) {
    return event.isGoal() || event.isOwnGoal() || event.isPenaltyGoal();
  })
}

Match.prototype.cards = function() {
  return this.events.filter(function(event) {
    return event.isYellow() || event.isSecondYellow() || event.isRed();
  })
}

Match.prototype.findPlayer = function(id) {
  return this.players.find(function(player) {
    return player.id == id;
  });
}

Match.prototype.hasEvents = function() {
  return this.events && this.events.length > 0;
}

Match.prototype.hasSubs = function() {
  return this.substitutions && this.substitutions.length > 0;
}

Match.prototype.hasCards = function() {
  return this.cards() && this.cards().length > 0;
}

Match.prototype.findTeam = function(idx) {
  if (idx = 1)
    return this.homeTeam;
  else
    return this.awayTeam;
}

Match.prototype.compare = function(other) {
  status = this.progress;
  otherStatus = other.progress;
  // console.log(status,otherStatus);
  if (status != otherStatus) {
    if (status == 'NS') {
      // the match has started
      // console.log("The match has started");
      return new MatchUpdate("live", other);
    }
    else if (otherStatus == "FT") {
      // the match has ended
      return new MatchUpdate("FT", other);
    }
    else if (otherStatus == "HT") {
      // the match is at halftime
      return new MatchUpdate("HT", other);
    }
    else if (status == "HT" && otherStatus != "HT") {
      return new MatchUpdate("SH", other);
    }
    else {
      score = this.score;
      otherScore = other.score;
      time = moment().format("H.mm");
      if (score != other.score) {

        beforeGoals = this.goals();
        newGoals = other.goals();

        diff = newGoals.filter(function(goal,index) {
          if (index >= beforeGoals.length)
            return goal;
        });

        event = diff[diff.length - 1];
        // get the last event

        return new MatchUpdate("SC", other, event);
      }
      else {

        if (other.hasCards() && (!this.hasCards() || (other.cards().length > this.cards().length))) {
          oldCards = this.cards();
          newCards = other.cards();

          oldLength = this.hasCards() ? oldCards.length : -1;
          diff = oldCards.filter(function(card, index) {
            if (index >= oldLength )
              return card;
          });

          event = diff[diff.length - 1];
          return new MatchUpdate("CARDS", other, event);
        }

        if (other.hasSubs() && (!this.hasSubs() || (other.substitutions.length > this.substitutions.length))) {
          oldSubs = this.substitutions;
          newSubs = other.substitutions;

          oldLength = this.hasSubs() ? oldSubs.length : -1;

          diff = newSubs.filter(function(sub, index) {
            if (index >= oldLength )
              return sub;
          });

          event = diff[diff.length - 1];
          return new MatchUpdate("SUB", other, event);
        }
      }
      return null;
    }
  }
}

function MatchUpdate(type, match, event) {
  this.type = type;
  this.match = match;
  this.event = event;
}

MatchUpdate.prototype.isStatusChange = function () {
  return (this.type == "HT" || this.type == "FT" || this.type == "KO" || this.type == "SH");
};

MatchUpdate.prototype.isKickOff = function() {
  return this.type = "KO";
}

MatchUpdate.prototype.isScore = function() {
  return this.type == "SC";
}

MatchUpdate.prototype.isHalfTime = function() {
  return this.type == "HT";
}

MatchUpdate.prototype.isSecondHalf = function() {
  return this.type == "SH";
}

MatchUpdate.prototype.isFullTime = function() {
  return this.type == "FT";
}

MatchUpdate.prototype.isSub = function() {
  return this.type == "SUB";
}

MatchUpdate.prototype.send = function() {
  if (this.isStatusChange()) {
    if (this.isKickOff()) {
      tubet.updateMatchStatus(this.match.matchId, "live", "*" + this.match.title + "*\r\n Kick off. " + this.match.score)
    }
    else if (this.isHalfTime()) {
      tubet.updateMatchStatus(this.match.matchId, "live", "*" + this.match.title + "*\r\nHalf Time. " + this.match.score);
    }
    else if (this.isSecondHalf()) {
      tubet.updateMatchStatus(this.match.matchId, "live", "*" + this.match.title + "*\r\nSecond half is underway. " + this.match.score);
    }
    else if (this.isFullTime()) {
      tubet.updateMatchStatus(this.match.matchId, "FT", "*" + this.match.title + "*\r\nFT. " + this.match.score);
    }
  }
  else if (this.isScore()) {
    tubet.updateMatchStatus(this.match.matchId, "live", "*" + this.match.title + "*\r\n⚽ Goal! " + this.event.minute + "' (" + this.event.player.name + ") " + this.match.score);
  }
  else if (this.isSub()) {
    tubet.updateMatchStatus(this.match.matchId, "live", "*" + this.match.title + "*\r\n" + this.event.getDescription());
  }
}

function _parseDate(dateString) {
  date = dateString.substring(0,8) + "T" + dateString.substring(8,14);
  return moment(date).format('llll');
}

function _getEventType(code) {
  switch (code) {
    case 37:
      return "Penalty! Goal";
      break;
    case 39:
      return "Own Goal";
      break;
    case 43:
      return "Yellow Card";
      break;
    case 45:
      return "Red Card";
      break;
    case 36:
      return "Goal";
      break;
    case 63:
      return "Assist";
      break;
    default:
      return "Unknown";
  }
}

module.exports = Match;
