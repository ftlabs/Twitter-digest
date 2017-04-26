require('dotenv').config();
const path = require('path');
const express = require('express');
const app = express();

const Twitter = require('twitter'),
    fs = require('fs');

var plugin = {};
var following = [];
var tweets = [];
var collection = [];

var topic = 'Trump';
 
var keys = {
    consumer_key : process.env.CONSUMER_KEY,
    consumer_secret : process.env.CONSUMER_SECRET,
    access_token_key : process.env.ACCESS_TOKEN,
    access_token_secret : process.env.ACCESS_SECRET
};

var client = new Twitter(keys);

app.get('/tweets/topic/:topic/:sinceID/:maxID', function(req, res){
	//TODO: user access token.
	topic = req.params.topic;
	console.log(req.params);
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


function getTweetsFromFollowing(params, callback) {
	//TODO: doesn't seem to include "in case you missed it" section
	client.get('statuses/home_timeline', params, function(err, data){
		if(err) {
			console.log(keys);
			console.log('ERROR', err);
			callback(plugin);
			return;
		}
		
		resetContents();
		for(var i in data) {
			//TODO: replace includes by case-insensitive regex?
			if(data[i].text.includes(topic) || data[i].text.includes(topic.toLowerCase())) {
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

app.listen(2017);