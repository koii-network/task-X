const Twitter = require('../adapters/twitter/twitter.js'); 

const credentials = { username: 'test_username', password: 'test_password', phone: 'test-phone-number' };
const db = {}; // Mock database instance
const maxRetry = 3;

jest.mock('../adapters/twitter/twitter.js'); // Mock the Twitter module

describe('Twitter', () => {
    let twitterInstance;
  
    beforeAll(() => {
      twitterInstance = new Twitter(credentials, db, maxRetry);
    });
  
    beforeEach(() => {
      jest.clearAllMocks();
    });
  
    it('should return false for invalid URL', async () => {
      twitterInstance.negotiateSession = jest.fn().mockResolvedValue(true);
      twitterInstance.verify = jest.fn().mockResolvedValue(false);
      await twitterInstance.negotiateSession();
      const result = await twitterInstance.verify("1447862024432");
  
      expect(result).toBe(false);
    });
});
describe('Twitter', () => {
    let twitterInstance;
  
    beforeAll(() => {
      twitterInstance = new Twitter(credentials, db, maxRetry);
    });
  
    beforeEach(() => {
      jest.clearAllMocks();
    });
  
    it('should return false for invalid URL', async () => {
        twitterInstance.negotiateSession = jest.fn().mockResolvedValue(true);
        twitterInstance.verify = jest.fn().mockResolvedValue(false);
        await twitterInstance.negotiateSession();
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
        
        const retrievedJSON = JSON.stringify(webresult);
        const parsedData = JSON.parse(retrievedJSON);
        const datajson = parsedData.data;
  
        
        console.log(retrievedJSON);
        const result = await twitterInstance.verify(tweetID, datajson);
      
  
        expect(result).toBe(false);
    });
});