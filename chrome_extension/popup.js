let currentTopic = null;

function setFormListener(enabled) {
    let form = document.getElementById('userSettings');
    let toggle = form.querySelector('.switch input');
    let topic = form.querySelector('#keyword');
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          let currTab = tabs[0];
          let tid = currTab.id;

          if (currTab) { // Sanity check
            toggle.checked = enabled;
            toggle.disabled = !enabled;
            topic.value = currentTopic;

            toggle.addEventListener('click', function(e){
                e.stopPropagation();
                if(e.currentTarget.checked) {
                    enableExtension(tid, toggle);
                } else {
                    disableExtension(tid, toggle);
                }
            });

            form.addEventListener('submit', (e) => {
                e.preventDefault();
                if(topic.value !== '')  {
                    let capitalised_topic = topic.value.charAt(0).toUpperCase() + topic.value.slice(1);
                    changeTopic(capitalised_topic, tid, toggle, enabled);
                } else {
                    toggle.checked = false;
                    disableExtension(tid, toggle);
                }
            });
          }
    });
}

function enableExtension(tid, toggle) {
    toggle.disabled = false;
    chrome.runtime.sendMessage({'set_state': 'enabled', 'tab': tid}, function(){
        setTimeout(() => {
            window.close();
        }, 500);
    });
}

function disableExtension(tid, toggle) {
    toggle.disabled = true;
    chrome.tabs.sendMessage(tid, {message:'resetfilter'}, function(){
        chrome.runtime.sendMessage({'set_state': 'disabled', 'tab': tid}, function(){
            setTimeout(() => {
                window.close();
            }, 500);
        });
    });
}

function changeTopic(topic, tid, toggle, enabled) {
    toggle.disabled = false;

    if(topic !== currentTopic) {
        currentTopic = topic;
        chrome.tabs.sendMessage(tid, {message:'resetfilter'}, function(){
            chrome.runtime.sendMessage({'set_topic': currentTopic, 'tab': tid}, function(){
                if (!enabled) {
                    toggle.click();
                } else {
                    enableExtension(tid, toggle);
                }
            });
        });
    }
}

function setExtensionContent(tabID, user) {
    let signup = document.getElementById('signup');
    signup.classList.add('hidden');

    let form = document.getElementById('userSettings');
    form.classList.remove('hidden');


    let active;
    chrome.storage.local.get(['extension_enabled'], function(results){
        if(results.extension_enabled === 'disabled') {
            active = false;
        } else {
            active = true;
        }

        chrome.storage.local.get(['tweet_selection'], function(results){
            console.log('getTweets', results);
            if(results.tweet_selection !== undefined) {
                if(results.tweet_selection.user === user) {
                    currentTopic = results.tweet_selection.topic;
                }
            }

            setFormListener(active);
        });
    });
}

function setLoginListener(tid) {
    let signup = document.getElementById('signup');

    signup.addEventListener('click', function(e){
        chrome.runtime.sendMessage({'request_login': true, 'tab': tid}, function(){});
    });
}

let port = chrome.extension.connect();
port.onMessage.addListener(function(msg) {
    var user = msg.user;
    var tabID = msg.tab;
    chrome.storage.local.get(user, function(results){
        if(results[user] !== undefined) {
            setExtensionContent(tabID, user);
        } else {
            setLoginListener(tabID, user);
        }
    });
});
