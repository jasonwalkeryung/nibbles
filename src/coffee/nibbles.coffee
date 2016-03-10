https = require('https')
pizzamath = (people, callback) ->
  n = Math.ceil(parseInt(people,10) * 3 / 8)
  callback "Pizza for #{people} = #{n} pies." + (if n > 20 then " (I'm kind of disgusted.)" else "");

parseMessage = (msg, callback) ->
  if qty = msg.match(/pizza for (\d+)/i)
    pizzamath(qty[1], callback)
  else if msg.match(/^what's for lunch/) and config.googleapis?
    google_places_api_url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json?key=#{config.googleapis.key}&location=#{config.googleapis.lat},#{config.googleapis.long}&type=#{config.googleapis.types[0]}&radius=200"
    # console.log(google_places_api_url)
    place_fetch = https.get(google_places_api_url, (res) ->
      console.log("Got response: #{res.statusCode}");

      # consume response body
      responseString=""

      res.on('data', (data) ->
        responseString += data;
      )

      res.on('end', ->
        places = JSON.parse(responseString);
        somewhere = _.sample(places.results)
        callback "How about #{somewhere.name}?";
      )
    ).on('error', (e) ->
      console.log("Got error: #{e.message}");
      callback false
    )
  else callback false

config = require('config')
_ = require('lodash')



# IRC
if config.irc?
  irc = require('irc')
  client = new irc.Client(config.irc.host, config.irc.nick, _.omit(config.irc, (value, opt) ->
    return opt == 'host' || opt == 'nick'
  ))

  # IRC integration
  client.addListener "registered", (message) ->
    console.log "Connected to " + config.irc.host

  client.addListener "message", (from, to, text, message) ->
    channel = message.args[0]
    parseMessage(text, (response) ->
      if response then client.say(channel, response)
    )

# http://chat.team.birchbox.com/hooks/45z3fbozfpyi385o1q6db3g74c
if config.mattermost? and config.mattermost.enabled
  options = {}
  Mattermost = require('node-mattermost');
  mattermost = new Mattermost(config.mattermost.url,options)

# Slack
if config.slack? and config.slack.enabled
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
    if message?
      parseMessage(message.text, (response) ->
        if response
          channel = slack.getChannelGroupOrDMByID(message.channel)
          channel.send response
      )
  slack.on 'error', (err) ->
      console.error "Error", err

  slack.login()
