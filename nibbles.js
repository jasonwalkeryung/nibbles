(function() {
  var Mattermost, Slack, _, client, config, https, irc, mattermost, options, parseMessage, pizzamath, slack, slack_config;

  https = require('https');

  pizzamath = function(people, callback) {
    var n;
    n = Math.ceil(parseInt(people, 10) * 3 / 8);
    return callback(("Pizza for " + people + " = " + n + " pies.") + (n > 20 ? " (I'm kind of disgusted.)" : ""));
  };

  parseMessage = function(msg, callback) {
    var google_places_api_url, place_fetch, qty;
    if (qty = msg.match(/pizza for (\d+)/i)) {
      return pizzamath(qty[1], callback);
    } else if (msg.match(/^what's for lunch/) && (config.googleapis != null)) {
      google_places_api_url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json?key=" + config.googleapis.key + "&location=" + config.googleapis.lat + "," + config.googleapis.long + "&type=" + config.googleapis.types[0] + "&radius=200";
      return place_fetch = https.get(google_places_api_url, function(res) {
        var responseString;
        console.log("Got response: " + res.statusCode);
        responseString = "";
        res.on('data', function(data) {
          return responseString += data;
        });
        return res.on('end', function() {
          var places, somewhere;
          places = JSON.parse(responseString);
          somewhere = _.sample(places.results);
          return callback("How about " + somewhere.name + "?");
        });
      }).on('error', function(e) {
        console.log("Got error: " + e.message);
        return callback(false);
      });
    } else {
      return callback(false);
    }
  };

  config = require('config');

  _ = require('lodash');

  if (config.irc != null) {
    irc = require('irc');
    client = new irc.Client(config.irc.host, config.irc.nick, _.omit(config.irc, function(value, opt) {
      return opt === 'host' || opt === 'nick';
    }));
    client.addListener("registered", function(message) {
      return console.log("Connected to " + config.irc.host);
    });
    client.addListener("message", function(from, to, text, message) {
      var channel;
      channel = message.args[0];
      return parseMessage(text, function(response) {
        if (response) {
          return client.say(channel, response);
        }
      });
    });
  }

  if ((config.mattermost != null) && config.mattermost.enabled) {
    options = {};
    Mattermost = require('node-mattermost');
    mattermost = new Mattermost(config.mattermost.url, options);
  }

  if ((config.slack != null) && config.slack.enabled) {
    Slack = require('slack-client');
    slack_config = {
      slackToken: config.slack.token,
      autoReconnect: true,
      autoMark: true
    };
    slack = new Slack(slack_config.slackToken, slack_config.autoReconnect, slack_config.autoMark);
    slack.on('open', function() {
      return console.log("Connected to " + slack.team.name + " as @" + slack.self.name);
    });
    slack.on('message', function(message) {
      if (message != null) {
        return parseMessage(message.text, function(response) {
          var channel;
          if (response) {
            channel = slack.getChannelGroupOrDMByID(message.channel);
            return channel.send(response);
          }
        });
      }
    });
    slack.on('error', function(err) {
      return console.error("Error", err);
    });
    slack.login();
  }

}).call(this);
