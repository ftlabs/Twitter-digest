# Twitter Digest
Chrome extension for Twitter. It allows users to filter their timeline based on a chosen keyword.

## How to install the extension
Clone [this repository](https://github.com/ftlabs/Twitter-digest), then visit `chrome://extensions`.
Check "Enable Developer mode".
Click "Load unpacked extension" and point to the `chrome_extension` folder of this project when prompted.

Now visit `twitter.com`, click on the extension icon ![alt text](https://github.com/ftlabs/Twitter-digest/blob/master/chrome_extension/icons/TD_logo_icon.png "Twitter Digest Icon") and select "Sign in with Twitter". This should grant the extension access until the `Feed Summary` app is revoked access from your Twitter account.
Note: When you first install the extension, you might need to refresh `twitter.com` for it to be enabled.

Once authenticated, select a keyword to filter in the extension popup. Note, if there are no results for your search, no digest will appear, but the extension will continue to filter new tweets.

You cannot use the extension toggle if there is no keyword selected.

## For devs

### About the Node server
The application requires a backend server to handle Twitter authentication and filtering requests.
It is currently on Heroku.

### The joys of OAuth
To handle user authentication to the `Feed Summary` Twitter app, this project uses OAuth and the `node-twitter-api` module.
Please beware: You need to pass a callback url when initiating the module, and it needs to match the URL you have set up in the `Feed Summary` app. See [developer.twitter.com](http://developer.twitter.com) to change the settings.

### Chrome extension tips
To avoid CORS issues, ensure you have granted access to all relevant domains in the extension's `manifest.json`.

