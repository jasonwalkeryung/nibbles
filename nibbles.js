(function() {
  var Slack, _, client, config, irc, parseMessage, pizzamath, slack, slack_config;

  pizzamath = function(people) {
    var n;
    n = Math.ceil(parseInt(people, 10) * 3 / 8);
    return 'Pizza for ' + people + ' = ' + n + ' pies';
  };

  parseMessage = function(msg) {
    var qty;
    if (qty = msg.match(/pizza for (\d+)/i)) {
      return pizzamath(qty[1]);
    } else {
      return false;
    }
  };

  config = require('config');

  irc = require('irc');

  _ = require('underscore');

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
    var channel, response;
    response = parseMessage(message.text);
    if (response != null) {
      console.log(response);
      channel = slack.getChannelGroupOrDMByID(message.channel);
      return channel.send(response);
    }
  });

  slack.on('error', function(err) {
    return console.error("Error", err);
  });

  slack.login();

  client = new irc.Client(config.irc.host, config.irc.nick, _.reject(config.irc, function(opt, value) {
    return opt === 'host' || opt === 'nick';
  }));

  client.addListener("registered", function(message) {
    return console.log("We're in!");
  });

  client.addListener("message", function(from, to, text, message) {
    var channel, response;
    channel = message.args[0];
    response = parseMessage(text);
    if (response != null) {
      return client.say(channel, response);
    }
  });

}).call(this);
