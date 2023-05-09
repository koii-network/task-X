// Import required modules
const Adapter = require('../../model/adapter');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

class Twitter extends Adapter {
  constructor(credentials, db, maxRetry) {
      super(credentials, maxRetry);
      this.credentials = credentials;
      this.db = db;
      this.toCrawl = []; 
      this.parsed = {};
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
    await this.page.waitForTimeout(1000);

    console.log('Step: Login successful');
  };

  parseItem = async (url) => {
    await this.page.setViewport({ width: 1920, height: 10000 });
    await this.page.goto(url);
    await this.page.waitForTimeout(2000);

    console.log("PARSE: " + url);
    const html = await this.page.content();
    const $ = cheerio.load(html);
    var data = [];
    var count = 0;

    const articles = $('article[data-testid="tweet"]').toArray();

    articles.forEach((el) => {
      const tweet_text = $(el).find('div[data-testid="tweetText"]').text();
      const tweet_user = $(el).find('a[tabindex="-1"]').text();
      const tweet_record = $(el).find('span[data-testid="app-text-transition-container"]');
      const commentCount = tweet_record.eq(0).text();
      const likeCount = tweet_record.eq(1).text();
      const shareCount = tweet_record.eq(2).text();
      const viewCount = tweet_record.eq(3).text();
      if (tweet_user && tweet_text) {
        data.push({
            user: tweet_user,
            content: tweet_text.replace(/\n/g, '<br>'),
            comment: commentCount,
            like: likeCount,
            share: shareCount,
            view: viewCount,
        });
      }
    });

    return data;
  }

  crawl = async (query) => {
    this.toCrawl = await this.fetchList(query.query);
    while (this.toCrawl.length > 0) {
      const url = this.toCrawl.shift();
      var data = await this.parseItem(url);
      this.parsed[url] = data;
      console.log(this.parsed);

      const newLinks = await this.fetchList(url);
      console.log(newLinks);

      this.toCrawl = this.toCrawl.concat(newLinks);
    }
  };

  fetchList = async(url) => {
    // Go to the hashtag page
    await this.page.waitForTimeout(1000);
    await this.page.setViewport({ width: 1920, height: 10000 });
    await this.page.goto(url);
  
    // Wait an additional 5 seconds until fully loaded before scraping
    await this.page.waitForTimeout(5000);
    // Scrape the tweets

    let scrapingData = {};

    const html = await this.page.content();
    const $ = cheerio.load(html);
    
    const links = $('a').toArray();

    // Filter the matching elements with the specified pattern
    const matchedLinks = links.filter((link) => {
      const href = $(link).attr('href');
      const regex = /\/status\/\d+[^/]*$/;
      return regex.test(href);
    });

    const linkStrings = [];
    matchedLinks.forEach((link) => {
      linkStrings.push('https://twitter.com' + $(link).attr('href'));
    });
  
    const uniqueLinks = getUnique(linkStrings);
    uniqueLinks.forEach((link) => {
      console.log(link);
    });

    return uniqueLinks;

    // $('div[data-testid="cellInnerDiv"]').each((i, el) => { 
    //   const tweet_text = $(el).find('div[data-testid="tweetText"]').text();
    //   const tweet_user = $(el).find('a[tabindex="-1"]').text();
    //   const tweet_record = $(el).find('span[data-testid="app-text-transition-container"]');
    //   const commentCount = tweet_record.eq(0).text();
    //   const likeCount = tweet_record.eq(1).text();
    //   const shareCount = tweet_record.eq(2).text();
    //   const viewCount = tweet_record.eq(3).text();
    //   if (tweet_user && tweet_text) {
    //     scrapingData[i] = {
    //         user: tweet_user,
    //         content: tweet_text.replace(/\n/g, '<br>'),
    //         comment: commentCount,
    //         like: likeCount,
    //         share: shareCount,
    //         view: viewCount,
    //     };
    //   }
    // });
    // return scrapingData;
  };

  processLinks = async (links) => {
    links.forEach((link) => {
    });
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

function getUnique(array) {
  return [... new Set(array)];
}

module.exports = Twitter;