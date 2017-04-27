const crypto = require('crypto');

module.exports = function(thingToHash){
    return crypto.createHash('sha1').update(thingToHash).digest('hex');
};