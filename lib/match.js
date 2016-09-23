var moment = require('moment');

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
  this.description = this.getDescription();
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
        return this.minute + "' - Goal by " + this.player.name;
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
  this.venue = raw["Vnm"];
  this.homeTeam = new Team(raw["T1"][0]);
  this.awayTeam = new Team(raw["T2"][0]);
  this.kickOff = _parseDate(raw["Esd"].toString());
  this.homeTeamScore = raw["Tr1"];
  this.homeHTScore = raw["Trh1"];
  this.awayTeamScore = raw["Tr2"];
  this.awayHTScore = raw["Trh2"];
  this.htScore = this.homeHTScore + "-" + this.awayHTScore;
  this.score = this.homeTeamScore + "-" + this.awayTeamScore;

  this.players = raw["Prns"].map(function(playerData) {
    return new Player(playerData);
  });

  var firstHalfIncidents = raw['Incs']['1'];
  var secondHalfIncidents = raw['Incs']['2'];

  if (!firstHalfIncidents)
    firstHalfIncidents = [];

  if (!secondHalfIncidents)
    secondHalfIncidents = [];

  var incidents = firstHalfIncidents.concat(secondHalfIncidents);
  var self = this;
  this.events = incidents.map(function(incident) {
    return new Event(incident, self);
  });
}

Match.prototype.findPlayer = function(id) {
  return this.players.find(function(player) {
    return player.id == id;
  });
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
