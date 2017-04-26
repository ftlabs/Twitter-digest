let currentTopic = null;

function setFormListener(tabID, enabled) {
    let form = document.getElementById('userSettings');
    let toggle = form.querySelector('.switch input');
    let topic = form.querySelector('#keyword');
    let tid = tabID;

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
        }
    });
}

function enableExtension(tid, toggle) {
    toggle.disabled = false;
    chrome.runtime.sendMessage({'set_state': 'enabled', 'tab': tid}, function(){
        setTimeout(() => {
            window.close();
        }, 400);
    });
}

function disableExtension(tid, toggle) {
    toggle.disabled = true;
    chrome.tabs.sendMessage(tid, {message:'resetfilter'}, function(){
        chrome.runtime.sendMessage({'set_state': 'disabled', 'tab': tid}, function(){
            setTimeout(() => {
                window.close();
            }, 400);
        });
    });
}

function changeTopic(topic, tid, toggle, enabled) {
    toggle.disabled = false;
    if(topic !== currentTopic) {
        chrome.tabs.sendMessage(tid, {message:'resetfilter'}, function(){
            currentTopic = topic;
            chrome.runtime.sendMessage({'set_topic': topic, 'tab': tid}, function(){
                if (!enabled) {
                    toggle.click();
                } else {
                    enableExtension(tid, toggle);
                }
            });
        });
    }
};

let port = chrome.extension.connect();
port.onMessage.addListener(function(tabID) {
    let active;
    chrome.storage.local.get(['extension_enabled'], function(results){
        if(results.extension_enabled === 'disabled') {
            active = false;
        } else {
            active = true;
        }

        chrome.storage.local.get(['tweet_selection'], function(results){
            if(results.tweet_selection !== undefined) {
                currentTopic = results.tweet_selection.topic;
            }

            setFormListener(tabID, active);
        });
    });
});
