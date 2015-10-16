pizzamath = (people) ->
  n = Math.ceil(parseInt(people,10) * 3 / 8)
  return 'Pizza for '+people+' = '+n+' pies';

parseMessage = (msg) ->
  if qty = msg.match(/pizza for (\d+)/i)
    return pizzamath(qty[1])
  else return false

config = require('config')
irc = require('irc')
_ = require('underscore')

# Slack
Slack = require 'slack-client'
slack_config = {
    slackToken: config.slack.token # Add a bot at https://my.slack.com/services/new/bot and copy the token here.
    autoReconnect: true # Automatically reconnect after an error response from Slack.
    autoMark: true # Automatically mark each message as read after it is processed.
}

# Slack integration
slack = new Slack(slack_config.slackToken, slack_config.autoReconnect, slack_config.autoMark)

slack.on 'open', ->
    console.log "Connected to #{slack.team.name} as @#{slack.self.name}"

slack.on 'message', (message) ->
  response = parseMessage(message.text)
  if response?
    console.log response
    channel = slack.getChannelGroupOrDMByID(message.channel)
    channel.send response

slack.on 'error', (err) ->
    console.error "Error", err

slack.login()

# IRC
client = new irc.Client(config.irc.host, config.irc.nick, _.omit(config.irc, (value, opt) ->
  return opt == 'host' || opt == 'nick'
))

# IRC integration
client.addListener "registered", (message) ->
  console.log "Connected to " + config.irc.host

client.addListener "message", (from, to, text, message) ->
  channel = message.args[0]
  response = parseMessage(text)
  if response? then client.say(channel, response)
