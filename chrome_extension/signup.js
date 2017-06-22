function signInRequest(user, callback) {
	let http = new XMLHttpRequest();
	let path = serverPath + "/login";


	http.onreadystatechange = function() {
	    if(http.readyState == 4 && http.status == 200) {
	        let token = JSON.parse(http.responseText).token;
	        let authLink = document.createElement('a');
	        authLink.setAttribute('href', 'https://twitter.com/oauth/authenticate?oauth_token=' + token);
	        authLink.setAttribute('target', '_blank');
	        document.body.appendChild(authLink);

	        authLink.click();
	        getCreds(user, token, callback);

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

function getCreds(user, token, callback) {
	let http = new XMLHttpRequest();
	let path = serverPath + "/credentials/" + token;

	http.onreadystatechange = function() {
	    if(http.readyState == 4 && http.status == 200) {
	        let result = JSON.parse(http.responseText);

	        var cookie = {};
	        cookie[user] = JSON.stringify({
	        	'token': result.access,
	        	'secret': result.secret
	        });

	        chrome.storage.local.set(cookie, function(){
		    	result.token = result.access;
		    	callback(result);
		    });
	    } else if(http.readyState == 4 && http.status === 204) {
	    	getCreds(user, token, callback);
	    }
	}

	http.open("GET", path, true);
	http.send();
}
