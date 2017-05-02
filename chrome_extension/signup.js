function signInRequest(callback) {
	let http = new XMLHttpRequest();
	let path = "http://localhost:2017/login"

	http.onreadystatechange = function() {
	    if(http.readyState == 4 && http.status == 200) {
	        let token = JSON.parse(http.responseText).token;
	        let authLink = document.createElement('a');
	        authLink.setAttribute('href', 'https://twitter.com/oauth/authenticate?oauth_token=' + token);
	        authLink.setAttribute('target', '_blank');
	        document.body.appendChild(authLink);

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
	let path = "http://localhost:2017/credentials/" + token;

	http.onreadystatechange = function() {
	    if(http.readyState == 4 && http.status == 200) {
	        let result = JSON.parse(http.responseText);
	        console.log(result);

	        chrome.storage.local.set({'user_logged_in': JSON.stringify({
		        	'token': result.access,
		        	'secret': result.secret
		        })
		    }, function(){
		    	result.token = result.access;
		    	callback(result);
		    });
	    } else if(http.readyState == 4 && http.status === 204) {
	    	getCreds(token, callback);
	    }
	}

	http.open("GET", path, true);
	http.send();
}
