// Import required modules
const Adapter = require('../../model/adapter');
const puppeteer = require('puppeteer');
//const twitterLogin = require('../../tests/twitter-login.js');

class Twitter extends Adapter {
  constructor(credentials, db, maxRetry) {
      super(credentials, maxRetry);
      this.credentials = credentials;
      this.db = db;
  }

  setup = async () => { 
    // Set the viewport to a reasonable size
    // * height influences the amount of tweets loaded
    // !! 50 tweets are loaded per viewport
    // TODO nextPage() or scrollPage() funciton to load more tweets
    await this.page.setViewport({ width: 1920, height: 10000 });
  }

  negotiateSession = async () => {
    this.browser = await puppeteer.launch({ headless: false });
    this.page = await this.browser.newPage();
    // Enable console logs in the context of the page
    this.page.on('console', consoleObj => console.log(consoleObj.text()));
    
    await this.page.setViewport({ width: 1920, height: 10000 });

    // await twitterLogin(this.page);
  }

  checkSession = async () => {
    return true;
  }

  newSearch = async (query) => {

  }
}

const parseTweet = async (tweet) => {
    console.log('new tweet!', tweet)
    let item = {
        id: tweet.id,
        data: tweet,
        list: getIdListFromTweet(tweet)
    }

    return item;
}

const getIdListFromTweet = (tweet) => {
    // parse the tweet for IDs from comments and replies and return an array
    
    return [];
}

module.exports = Twitter;