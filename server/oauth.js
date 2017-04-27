const express = require('express');
const router = express.Router();

const appPort = process.env.PORT || 2017;
const fetch = require('node-fetch');
const hash = require('hmacsha1');
const nonce = require('./bin/lib/nonce');

const twitterServiceURL = 'https://api.twitter.com';
const callbackURL = process.env.callbackURL || `http://localhost:${appPort}/callback`

const keys = {
    consumer_key : process.env.CONSUMER_KEY,
    consumer_secret : process.env.CONSUMER_SECRET,
    access_token_key : process.env.ACCESS_TOKEN,
    access_token_secret : process.env.ACCESS_SECRET
};

router.get('/callback', function(req, res){

	console.log(req.query);
	res.send(req.query);

});

function doIt(){

	const URLForSigning = `${twitterServiceURL}/oauth/request_token?oauth_callback=${callbackURL}`;

	/*const authHeader = `OAuth oauth_consumer_key="${keys.consumer_key}",
	oauth_nonce="${nonce()}",
	oauth_signature="${hash( `${keys.consumer_secret}&${keys.access_token_secret}` ,`POST&${ encodeURIComponent(URLForSigning) }` )}",
	oauth_signature_method="HMAC-SHA1",
	oauth_timestamp="${(Date.now() / 1000) | 0}",
	oauth_version="1.0"`;*/

	const authHeader = `OAuth oauth_consumer_key="${keys.consumer_key}",oauth_nonce="${nonce()}",oauth_signature="${hash( `${keys.consumer_secret}&${keys.access_token_secret}` ,`POST&${ (URLForSigning) }` )}",oauth_signature_method="HMAC-SHA1",oauth_timestamp="${(Date.now() / 1000) | 0}",oauth_version="1.0"`;

	console.log('AUTHHEADER', authHeader);

	fetch(`${twitterServiceURL}/oauth/request_token?oauth_callback=${encodeURIComponent(callbackURL)}`, {
			method : 'POST',
			headers : {
				'Authorization' : authHeader
			}
		})
		.then(function(res){

			if(res.ok){
				return res.json();
			} else {
				throw res;
			}

		})
		.then(data => {
			console.log(data);
		})
		.catch(err => {
			console.log('/authenticate error');

			err.json()
				.then(d => {
					console.log(d);
				})
			;

		})

}

doIt();

router.get('/authenticate', function(req, res, next){

	// https://api.twitter.com/oauth/request_token?oauth_callback=http%3A%2F%2Flocalhost%3A3456%2Fcallback

	res.end();

});

module.exports = router;