require('dotenv').config();
const path = require('path');
const express = require('express');
const app = express();
const https = require('https');
const session = require('express-session');
const appPort = process.env.PORT || 2017;
const fs = require('fs');

const Twitter = require('twitter'),
twitterAPI = require('node-twitter-api');

var plugin = {};
var following = [];
var tweets = [];
var collection = [];
var topic = '';
 
var keys = {
    consumer_key : process.env.CONSUMER_KEY,
    consumer_secret : process.env.CONSUMER_SECRET,
    access_token_key : null,
    access_token_secret : null
};

let twitterLogin = new twitterAPI({
	consumerKey: keys.consumer_key,
	consumerSecret: keys.consumer_secret,
	callback: process.env.CALLBACK_URL
});

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true
}));

app.get('/tweets/user/:secret/:access/topic/:topic/:sinceID/:maxID', function(req, res){
	topic = req.params.topic;
	keys.access_token_key = req.params.access;
	keys.access_token_secret = req.params.secret;

	var query_params = {};
	if(parseInt(req.params.sinceID) !== 0) {
		query_params.since_id = parseInt(req.params.sinceID);
	}

	if(parseInt(req.params.maxID) !== 0) {
		query_params.max_id = parseInt(req.params.maxID);
	}

	query_params.count = 200;

	getTweetsFromFollowing(query_params, function(params){
		res.json(params);
	});
});

app.get('/login', function(req, res){
	twitterLogin.getRequestToken(function(error, requestToken, requestTokenSecret, results){
	    if (error) {
	        console.log("Error getting OAuth request token : " + JSON.stringify(error));
	    } else {
	        var sessionCookie = req.session.sessionCookie = {
	    		'token': requestToken,
	    		'secret': requestTokenSecret
		  	}

	        res.json({
	        	token: requestToken
	        });
	    }
	});
});

app.get('/callback', function(req, res){
	twitterLogin.getAccessToken(req.session.sessionCookie.token, req.session.sessionCookie.secret, req.query.oauth_verifier, function(error, accessToken, accessTokenSecret, results) {
	    if (error) {
	        console.log(error);
	    } else {
	    	req.session.sessionCookie.access = accessToken;
		    req.session.sessionCookie.accessKey = accessTokenSecret;
	    	res.end();
	    }
	});
});

app.get('/credentials/:token', function(req, res){
	if(req.session.sessionCookie.token === req.params.token && !!req.session.sessionCookie.access) {
		res.json({
			'access': req.session.sessionCookie.access,
			'secret': req.session.sessionCookie.accessKey
		});
	} else {
		res.status(204).send('Creds not ready');
	}
});


function getTweetsFromFollowing(params, callback) {
	var client = new Twitter(keys);
	client.get('statuses/home_timeline', params, function(err, data){
		if(err) {
			var errorID;
			var error = err.find((i) => {
				if(i.code === 89) {
					errorID = i.message;
	            	return true;
				}

				return false;
	        });

			if(error) {
				callback({'error': errorID});
	        } else {
				callback(plugin);
			}
			return;
		}
		
		resetContents();
		for(var i in data) {
			//TODO: replace includes by case-insensitive regex?
			//TODO: doesn't seem to include "in case you missed it" section
			if(data[i].text.toLowerCase().includes(topic.toLowerCase())) {
				tweets.push(data[i]);

				if(data[i].retweeted_status) {
					collection.push(data[i].retweeted_status.id_str);
				} else	collection.push(data[i].id_str);
			}

			//TODO: check content of retweet/quoted tweet/media
		}

		plugin.topic = topic;
		plugin.collection = collection;
		plugin.tweets = tweets;

		//Handy feedback during dev
		console.log(plugin.tweets.length + ' tweets digested');

	 	callback(plugin);
	});
	
}

function resetContents() {
	plugin = {};
	following = [];
	tweets = [];
	collection = [];
}

app.listen(appPort);