let lastCall = 0;
let USER_ACCESS, USER_SECRET, currentUser;
let saved_topic;
window.requestDone = false;
const serverPath = "https://ftlabs-twitter-digest.herokuapp.com";

chrome.runtime.onMessage.addListener(function (message, sender, callback) {
    if (message['enable_page_action'] && sender.tab.active) {
        let tid = sender.tab.id;

        currentUser = message['enable_page_action'];

        chrome.storage.local.get(currentUser, function(results) {
            if(results[currentUser] !== undefined) {
                setCredentials(JSON.parse(results[currentUser]));
            } else {
                resetUser(tid);
            }

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
               port.postMessage({'user': currentUser, 'tab': tid});
            });
            
            chrome.pageAction.show(tid);
        });

    } else if(message['load_old_tweets']){
        pollTweets(sender.tab.id, 'load_old', message['load_old_tweets']);
    } else if(message['load_new_tweets']) {
        pollTweets(sender.tab.id, 'load_new', message['load_new_tweets']);
    } else if(message['set_cookie']) {
        var selection = message['set_cookie'];
        if(!selection.user) selection.user = currentUser;
    	chrome.storage.local.set({'tweet_selection': selection});
    } else if(message === 'delete_cookie') {
    	chrome.storage.local.remove('tweet_selection');
        chrome.storage.local.remove('digest_topic');
        saved_topic = '';
    } else if(message['set_state']) {
        setState(message['set_state'], message['tab']);
    } else if(message['set_topic']) {
        saved_topic = message['set_topic'];
        chrome.storage.local.set({'digest_topic': message['set_topic']});
    } else if(message['request_login']) {
        signInRequest(currentUser, function(credentials) {
            setCredentials(credentials);
            chrome.tabs.update(message['tab'], {selected: true});
            chrome.tabs.sendMessage(message['tab'], {message:'reloadWindow'}, function(){});
        });
    }
});

function setCredentials(credentials) {
    USER_ACCESS = credentials.token;
    USER_SECRET = credentials.secret;
}

function resetUser(tid) {
    USER_ACCESS = null;
    USER_SECRET = null;
    chrome.storage.local.remove(currentUser);
    chrome.storage.local.remove('tweet_selection');
    chrome.storage.local.remove('digest_topic');
    saved_topic = '';

    setState('disabled', tid);

    var views = chrome.extension.getViews({
        type: "popup"
    });
    
    views.forEach(function(view){
        var signup = view.document.getElementById('signup');
        signup.classList.remove('hidden');

        var form = view.document.getElementById('userSettings');
        form.classList.add('hidden');
    });
}

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

              if(fetchResult.error) {
                resetUser(tid);
                return;
              }

              chrome.storage.local.get(['tweet_selection'], function(results){
                if(results.tweet_selection === undefined) {
                    if(fetchResult.tweets.length > 0) {
                        chrome.tabs.sendMessage(tid, {message:'sendfilter', filter:fetchResult}, function(){}); 
                    } else {
                        chrome.tabs.sendMessage(tid, {message:'topicNoResults', result: fetchResult}, function(){});
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
                        var empty_results = {
                            topic: saved_topic,
                            collection: [],
                            tweets: []
                        }
                        chrome.tabs.sendMessage(tid, {message:'topicNoResults', filter: empty_results}, function(){});
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
    let path = serverPath + "/tweets/user/"+USER_SECRET+"/"+USER_ACCESS;
    let topic, sinceID, maxID;

    chrome.storage.local.get(['digest_topic'], function(results){
        if(results.digest_topic !== undefined) {
            topic = results.digest_topic;
        } else {
            topic = saved_topic;
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