const Twitter = require('../adapters/twitter/twitter.js'); 


const credentials = { username: process.env.TWITTER_USERNAME, password: process.env.TWITTER_PASSWORD, phone: 'your-phone-number' };
const db = {}; // Replace with your actual database instance or mock
const maxRetry = 3;

const twitterInstance = new Twitter(credentials, db, maxRetry);

(async () => {
    await twitterInstance.negotiateSession();
    try {
      
    } catch (error) {
      console.error('Error:', error);
    }
})();
  