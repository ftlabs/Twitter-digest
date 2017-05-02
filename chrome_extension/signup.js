function signInRequest(callback) {
	let http = new XMLHttpRequest();
	let path = "https://ftlabs-twitter-digest.herokuapp.com/login"

	http.onreadystatechange = function() {
		console.log(http);
	    if(http.readyState == 4 && http.status == 200) {
	        let token = JSON.parse(http.responseText).token;
	        let authLink = document.createElement('a');
	        authLink.setAttribute('href', 'https://twitter.com/oauth/authenticate?oauth_token=' + token);
	        authLink.setAttribute('target', '_blank');
	        document.body.appendChild(authLink);

	        console.log('cookie login:', JSON.parse(http.responseText).cookie);
	        console.log('login callback:', JSON.parse(http.responseText).callback);

	        authLink.click();
	        getCreds(token, callback);

	        //In case the callback isn't fired and users need to be able to sign in again
			window.requestDone = false;
	    }
	}

	if(!window.requestDone) {	
		http.open("GET", path, true);
		http.send();
		window.requestDone = true;
	}
}

function getCreds(token, callback) {
	let http = new XMLHttpRequest();
	let path = "https://ftlabs-twitter-digest.herokuapp.com/credentials/" + token;

	http.onreadystatechange = function() {
	    if(http.readyState == 4 && http.status == 200) {
	        let result = JSON.parse(http.responseText);
	        // console.log(result);
	        console.log('cookie creds:', JSON.parse(http.responseText).cookie);

	        chrome.storage.local.set({'user_logged_in': JSON.stringify({
		        	'token': result.access,
		        	'secret': result.secret
		        })
		    }, function(){
		    	result.token = result.access;
		    	callback(result);
		    });
	    } else if(http.readyState == 4 && http.status === 204) {
	    	console.log(http);
	    	getCreds(token, callback);
	    }
	}

	http.open("GET", path, true);
	http.send();
}
