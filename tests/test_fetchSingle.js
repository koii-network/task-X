const Twitter = require('../adapters/twitter/twitter.js'); 
const bcrypt = require('bcryptjs');

const credentials = { username: process.env.TWITTER_USERNAME, password: process.env.TWITTER_PASSWORD, phone: 'your-phone-number' };
const db = {}; // Replace with your actual database instance or mock
const maxRetry = 3;

const twitterInstance = new Twitter(credentials, db, maxRetry);

(async () => {
    await twitterInstance.negotiateSession();
    try {
      const tweetID = '1813083694112076127'; // Replace with the actual URL you want to fetch
    
      const webresult = {
        "id": "1813083694112076127",
        "round": 330,
        "data": {
          "user_name": "AsapChingon",
          "screen_name": "@Roberto_G91",
          "user_url": "https://twitter.com/Roberto_G91",
          "user_img": "https://pbs.twimg.com/profile_images/1786496451796713472/T_-8HfZg_normal.jpg",
          "tweets_id": "1813083694112076127",
          "tweets_content": "Mary Jane will always be here, I’ll re connect with her at some point later in life. Right now it’s all business",
          "time_post": 1721107812,
          "time_read": 1721108017123,
          "comment": "",
          "like": "",
          "share": "",
          "view": "1",
          "outer_media_url": [],
          "outer_media_short_url": [],
          "keyword": "later"
        },
        "_id": "0e2leB4TSrw4tYPK"
      };
      const originData = webresult.data.tweets_content+webresult.data.time_post;
      const saltRounds = 10;
      const salt = bcrypt.genSaltSync(saltRounds);
      const hash = bcrypt.hashSync(originData, salt);
      webresult.data.hash = hash;
      const retrievedJSON = JSON.stringify(webresult);
      const parsedData = JSON.parse(retrievedJSON);
      const datajson = parsedData.data;

      
      console.log(retrievedJSON);
      const result = await twitterInstance.verify(tweetID, datajson);
      console.log(result);
    } catch (error) {
      console.error('Error:', error);
    }
})();
  