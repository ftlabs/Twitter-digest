let timelineObserver, newTweetsObserver, filter;
const config = { attributes: true, childList: true, characterData: true };
let maxID = 0;
let sinceID = 0;
let lastRequested = 0;
const max_cache = 43200000; //12 hours

chrome.runtime.onMessage.addListener((message) => {
	if(message.message === 'sendfilter') {
		filter = message.filter;
		
		updateSinceID();
		updateMaxID();

		let stream = document.querySelector('.stream-container >.stream >ol.stream-items');
		if(stream.querySelector('.digest-stream') !== null) stream.querySelector('.digest-stream').remove();

		for(let i = 0; i < filter.tweets.length; ++i) {
			if(filter.tweets[i] !== null) {
				let isOld = tweetIsOld(filter.tweets[i]);
				let tweet = document.querySelector('.stream-item[data-item-id="'+filter.tweets[i].id_str+'"]');

				if(tweet !== null && !isOld) {
					tweet.classList.add('hidden');
					if(!filter.tweets[i].digestScore) filter.tweets[i].digestScore = getDigestScore(tweet);
					filter.tweets[i].hidden = false;
				}
				else {
					if(isOld) {
						filter.tweets.splice(i, 1);
					} else {
						filter.tweets[i].hidden = true;	
					}
				}
			} else {
				filter.tweets.splice(i, 1);
			}
		}

		chrome.runtime.sendMessage({'set_cookie': filter}, function(){});

		lastRequested = filter.tweets[filter.tweets.length - 1].id || 0;

		let hideDigest = (window.location.pathname !== '/')?'hidden':'';
		let header = document.createElement('li');
		header.setAttribute("class", "digest-stream "+hideDigest+" js-stream-item stream-item has-recap js-no-dedup js-has-navigable-stream stream-item separated-module");
		header.setAttribute("data-digest-topic", filter.topic.toLowerCase());
		header.innerHTML = '<div class="recap-header">\
		Your <b>'+filter.topic+'</b> digest\
		</div>';

		addTweets(header, sortVisibleTweets(filter.tweets));
		stream.insertBefore(header, stream.querySelectorAll("li.stream-item")[1]);

		setObserver(stream);

	} else if(message.message === 'resetfilter') {
		maxID = 0;
		sinceID = 0;
		lastRequested = 0;

		if(timelineObserver)	
			timelineObserver.disconnect();
		if(newTweetsObserver)
			newTweetsObserver.disconnect();
		if(filter)	showOriginalTweets(filter);
		chrome.runtime.sendMessage('delete_cookie', function(){});
	} else if(message.message === 'reloadWindow') {
		location.reload();
	} else if(message.message === 'topicNoResults') {
		chrome.runtime.sendMessage({'set_cookie': message.filter}, function(){});
	}
});

function addTweets(container, content) {
	if (content.length === 0) {
		container.classList.add('hidden');
		return;
	}
	container.classList.remove('hidden');

	let list = document.createElement("ol");
	list.setAttribute('class', "stream-items digest-container recap-module js-navigable-stream dismissible-content");

	let featured = content.length > 1? 2 : 1;

	for(let i = 0; i < featured; ++i) {
		let tweetContainer = document.createElement('li');
		let verified = content[i].user.verified?'<span class="UserBadges"><span class="Icon Icon--verified"><span class="u-hiddenVisually">Verified account</span></span></span>':'';
		tweetContainer.setAttribute('class', "js-stream-item stream-item stream-item");
		tweetContainer.innerHTML ='<div class="tweet js-stream-tweet js-actionable-tweet js-profile-popup-actionable" data-permalink-path=/'+content[i].user.screen_name+'/status/'+content[i].id_str+'>\
			<div class="content">\
				<div class="stream-item-header">\
					<a class="account-group js-account-group js-action-profile js-user-profile-link js-nav" href="/'+content[i].user.screen_name.toLowerCase()+'" data-user-id="'+content[i].user.id+'">\
					    <img class="avatar js-action-profile-avatar" src="'+content[i].user.profile_image_url.split(":")[1]+'" alt="">\
					    <span class="FullNameGroup">\
					      <strong class="fullname js-action-profile-name show-popup-with-id " data-aria-label-part="">'+content[i].user.name+'</strong><span>&rlm;</span>'+verified+'<span class="UserNameBreak">&nbsp;</span></span><span class="username js-action-profile-name" data-aria-label-part=""><s>@</s><b>'+content[i].user.screen_name+'</b></span>\
					</a>\
				</div>\
          		<div class="js-tweet-text-container">\
  					<p class="TweetTextSize  js-tweet-text tweet-text" lang="en" data-aria-label-part="0">'+content[i].text+'</p>\
		  		</div>\
        	</div>\
        </div>'

		list.appendChild(tweetContainer);
	}
	if(content.length > 2) {
		let smallFeatured = content.length > 6? 4 : 5;
		for(let i = 2; i < content.length; ++i) {
			let canCollapse = i > smallFeatured?' tweet-collapsible':'';
			let tweetContainer = document.createElement('li');
			tweetContainer.setAttribute('class', "js-stream-item stream-item stream-item digest-stream-item" + canCollapse);
			tweetContainer.innerHTML ='<div class="tweet digest-tweet js-stream-tweet js-actionable-tweet js-profile-popup-actionable" data-permalink-path=/'+content[i].user.screen_name+'/status/'+content[i].id_str+'>\
				<div class="content">\
	          		<div class="js-tweet-text-container">\
	  					<p class="TweetTextSize  js-tweet-text tweet-text" lang="en" data-aria-label-part="0"><span class="digest-source">'+content[i].user.name+'</span>'+content[i].text+'</p>\
			  		</div>\
	        	</div>\
	        </div>'

			list.appendChild(tweetContainer);
		}
	}

	let toggle = document.createElement('li');
	toggle.setAttribute('class', "js-stream-item stream-item stream-item digest-item-toggle");
	toggle.innerHTML = '<div class="new-tweets-bar digest-toggle-tweets">View more Tweets</div>';

	
	if(content.length > 6) {
		bindToggle(toggle, list);	
		list.appendChild(toggle);
		toggle.click();
	}

	container.appendChild(list);
}

function showOriginalTweets(filter, stream) {
	for(let i in filter.collection) {
		let tweet = document.querySelector('.stream-item[data-item-id="'+filter.collection[i]+'"]');
		if(tweet !== null) tweet.classList.remove('hidden');
	}

	let digests = document.querySelectorAll('.digest-stream');
	digests.forEach(function(digest){
		digest.remove();	
	});
}

function setObserver(target) {
	let stream = target;
	let streamParent = document.querySelector('.js-new-items-bar-container');
	
	timelineObserver = new MutationObserver(function(mutations){
	  	mutations.forEach(function(mutation){
	  		if(mutation.type === 'childList') {
	  			if(mutation.nextSibling === null) {
	  				requestOldTweets();
	  			}
	  		}
	  	});
	});

	newTweetsObserver = new MutationObserver(function(mutations){
		mutations.forEach(function(mutation){
	  		if(mutation.type === 'childList') {
	  			let newTweets = document.querySelector('.js-new-tweets-bar');
				if(newTweets !== null) {
					newTweets.addEventListener('click', () => {
						requestNewTweets(() => {
							updateDigestPosition(stream);
							updateSinceID();
						});
					});
				}
	  		}
	  	});
	});

	timelineObserver.observe(stream, config);
	newTweetsObserver.observe(streamParent, config);
}

function requestNewTweets(callback) {
	chrome.runtime.sendMessage({'load_new_tweets': sinceID}, callback);
}

function requestOldTweets() {
	if(lastRequested < maxID) {
		lastRequested = maxID;
		chrome.runtime.sendMessage({'load_old_tweets': maxID}, updateMaxID);
	}
}

function updateDigestPosition(parent) {
	let digest = document.querySelector('.digest-stream');
	if(getIndex(digest) > 1) {
		parent.insertBefore(digest, parent.querySelectorAll("li.stream-item")[1]);
	}
}

function bindToggle(toggle, container) {
	let list = (container === null)?document.querySelector('ol.digest-container'):container;
	let remainingTweetCount = list.querySelectorAll('li.stream-item').length - 5;

	toggle.addEventListener('click', function(e){
		list.querySelectorAll('.digest-stream-item.tweet-collapsible').forEach(function(item){
			item.classList.value.includes('hidden')?item.classList.remove('hidden'):item.classList.add('hidden');
		});

		let cta = toggle.querySelector('.digest-toggle-tweets');

		if(list.querySelectorAll('.digest-stream-item.tweet-collapsible.hidden').length > 0) {
			cta.textContent = 'View '+ remainingTweetCount +' more Tweets';
		} else {
			cta.textContent = 'View fewer Tweets';
		}
	});
}

function getDigestScore(tweet) {
	let retweet_score = tweet.querySelector('.js-actionRetweet .ProfileTweet-actionCountForPresentation').textContent;
	let favorite_score = tweet.querySelector('.js-actionFavorite .ProfileTweet-actionCountForPresentation').textContent;

	return parseInt(retweet_score) + parseInt(favorite_score);
}

function sortVisibleTweets(tweet_array) {
	tweet_array.sort(function(a,b){
		return b.digestScore - a.digestScore;
	});

	for(let i = tweet_array.length - 1; i >= 0; --i) {
		if(!!tweet_array[i].hidden) {
			tweet_array.splice(i,1)
		}
	}

	return tweet_array;
}

function tweetIsOld(tweet) {
	let time_diff = new Date().getTime() - new Date(tweet.created_at).getTime();

	return time_diff > max_cache;
}

function getIndex(node){
	if(node !== null) {	
	    let i = 1;
	    while (node = node.previousSibling) {
	        if (node.nodeType === 1) { ++i }
	    }
	    return i;
	}

	return 0;
}

function updateSinceID() {
	sinceID = document.querySelector('.stream-container').getAttribute('data-max-position');
}

function updateMaxID() {
	maxID = document.querySelector('.stream-container').getAttribute('data-min-position');
}

function toggleExtension() {
	var userID = JSON.parse(document.getElementById('init-data').value).userId;
	chrome.runtime.sendMessage({'enable_page_action': userID}, function () {});
}

document.addEventListener('DOMContentLoaded', toggleExtension);

window.addEventListener('popstate', function(){
	setTimeout(function(){
		
		timelineObserver.disconnect();
		newTweetsObserver.disconnect();

		let stream = document.querySelector('.stream-container >.stream >ol.stream-items');
		updateDigestPosition(stream);
		setObserver(stream);

		let toggle = document.querySelector('.digest-item-toggle');
		if(toggle !== null) bindToggle(toggle, null);
	}, 100);
});