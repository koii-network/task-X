// Import required modules
const Adapter = require('../../model/adapter');
const puppeteer = require('puppeteer');

class Twitter extends Adapter {
  constructor(credentials, db, maxRetry) {
      super(credentials, maxRetry);
      this.credentials = credentials;
      this.db = db;
  }

  negotiateSession = async () => {
    this.browser = await puppeteer.launch({ headless: false });
    this.page = await this.browser.newPage();
    // Enable console logs in the context of the page
    this.page.on('console', consoleObj => console.log(consoleObj.text()));
    
    await this.page.setViewport({ width: 1920, height: 1000 });

    await this.twitterLogin();
  }
  
  twitterLogin = async () => {
    await this.page.goto('https://twitter.com');
    await this.page.waitForTimeout(1000);
    await this.page.goto('https://twitter.com/i/flow/login');
    // Wait an additional 5 seconds before scraping
    await this.page.waitForTimeout(5000);

    console.log('Step: Fill in username');

    console.log(this.credentials.username);
    await this.page.waitForSelector('input[autocomplete="username"]');
    await this.page.type('input[autocomplete="username"]', this.credentials.username);
    await this.page.keyboard.press('Enter');

    const twitter_verify = await this.page
      .waitForSelector('input[data-testid="ocfEnterTextTextInput"]', {
        timeout: 5000,
        visible: true,
      })
      .then(() => true)
      .catch(() => false);

    if (twitter_verify) {
      await this.page.type(
        'input[data-testid="ocfEnterTextTextInput"]',
        this.credentials.username,
      );
      await this.page.keyboard.press('Enter');
    }

    console.log('Step: Fill in password');

    await this.page.waitForSelector('input[name="password"]');
    await this.page.type('input[name="password"]', this.credentials.password);
    await this.page.keyboard.press('Enter');

    console.log('Step: Click login button');

    this.page.waitForNavigation({ waitUntil: 'load' });

    console.log('Step: Login successful');
  };

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