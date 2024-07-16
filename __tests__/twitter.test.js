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
