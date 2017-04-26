let lastCall = 0;

chrome.runtime.onMessage.addListener(function (message, sender, callback) {
    if (message === 'enable_page_action') {
        let tid = sender.tab.id;
        
        chrome.storage.local.get(['extension_enabled'], function(results){
            if(results.extension_enabled === undefined) {
                chrome.runtime.sendMessage({'set_state': 'enabled'}, function(){
                    pollTweets(tid, 'connect');
                });
            } else if(results.extension_enabled === 'enabled') {
                pollTweets(tid, 'connect');
            }

            setExtensionIcon(tid, results.extension_enabled);
        });

        chrome.extension.onConnect.addListener(function(port) {
           port.postMessage(tid);
        });
        
        chrome.pageAction.show(tid);

    } else if(message['load_old_tweets']){
        pollTweets(sender.tab.id, 'load_old', message['load_old_tweets']);
    } else if(message['load_new_tweets']) {
        pollTweets(sender.tab.id, 'load_new', message['load_new_tweets']);
    } else if(message['set_cookie']) {
    	chrome.storage.local.set({'tweet_selection': message['set_cookie']});
    } else if(message === 'delete_cookie') {
    	chrome.storage.local.remove('tweet_selection');
        chrome.storage.local.remove('digest_topic');
    } else if(message['set_state']) {
        setState(message['set_state'], message['tab']);
    } else if(message['set_topic']) {
        chrome.storage.local.set({'digest_topic': message['set_topic']});
    }
});

function setState(state, tab) {
    chrome.storage.local.set({'extension_enabled': state});
    setExtensionIcon(tab, state);

    if(state === 'enabled')  pollTweets(tab, 'connect');
}

function setExtensionIcon(tid, state) {
    let path;

    switch(state) {
        case 'disabled':
            path = "./icons/TD_logo_disabled_icon.png";
        break;

        default:
            path = "./icons/TD_logo_icon.png";
    }

    chrome.pageAction.setIcon({
        tabId: tid,
        path : path
    });
}

function pollTweets(tid, action, param) {
    let xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == 4) {
            if(xmlhttp.status == 200) {
              fetchResult = JSON.parse(xmlhttp.responseText);
              chrome.storage.local.get(['tweet_selection'], function(results){
                if(results.tweet_selection === undefined) {
                    if(fetchResult.tweets.length > 0) {
                        chrome.tabs.sendMessage(tid, {message:'sendfilter', filter:fetchResult}, function(){}); 
                    } else {
                        setState('disabled', tid);
                    }
                } else {
                    combineTweets(tid, fetchResult, results.tweet_selection);
                }
              });
            } else {
                chrome.storage.local.get(['tweet_selection'], function(results){
                    if(results.tweet_selection !== undefined) {
                        chrome.tabs.sendMessage(tid, {message:'sendfilter', filter:results.tweet_selection}, function(){}); 
                    } else {
                      setState('disabled', tid);   
                    }
                });
            }
        }
    }

    let timestamp = new Date().valueOf();
    //avoid multiple API calls

    if(timestamp > lastCall + 1000) {   
        getPath(action, tid, param, function(path){
           xmlhttp.open("GET", path, true);
           xmlhttp.send();
        });   
    }

    lastCall = timestamp;
}

function getPath(action, tid, tweet_id, callback) {
    let path = "http://localhost:2017/tweets";
    let topic, sinceID, maxID;

    chrome.storage.local.get(['digest_topic'], function(results){
        if(results.digest_topic !== undefined) {
               topic = results.digest_topic;
        }

        path += '/topic/' + topic;

        switch(action) {
            case 'load_old':
                path += '/0/' + tweet_id;
            break;

            case 'load_new':
                path += '/' + tweet_id + '/0';
            break;

            case 'connect':
            default:
                path += '/0/0';
        }

        callback(path);
    });
}

function combineTweets(tid, newTweets, existingTweets) {
  let collection = existingTweets.collection;
  let tweets = existingTweets.tweets;

  for(let i=0; i < newTweets.collection.length; ++i) {
    if(collection.indexOf(newTweets.collection[i]) === -1) {
        collection.push(newTweets.collection[i]);
        let associated_tweet = newTweets.tweets.find((tweet) => {
            return tweet.id_str === newTweets.collection[i];
        });

        if(associated_tweet !== null)   tweets.push(associated_tweet);
    }
  }

  chrome.tabs.sendMessage(tid, {message:'sendfilter', filter:sanitiseTweets(existingTweets)}, function(){});
}

function sanitiseTweets(selection) {
    let tweets = selection.tweets;

    for(let i = tweets.length - 1; i >= 0; --i) {
        if(tweets[i] === null)  tweets.splice(i, 1);
    }

    selection.tweets = tweets;

    return selection;
}