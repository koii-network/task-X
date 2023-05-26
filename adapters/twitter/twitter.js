// Import required modules
const Adapter = require('../../model/adapter');
//const puppeteer = require('puppeteer');
const PCR = require("puppeteer-chromium-resolver");
const cheerio = require('cheerio');
var crypto = require('crypto');
const { Web3Storage, File } = require('web3.storage');
const Data = require('../../model/data');

function getAccessToken() {
  // If you're just testing, you can paste in a token
  // and uncomment the following line:
  // return 'paste-your-token-here'

  // In a real app, it's better to read an access token from an
  // environement variable or other configuration that's kept outside of
  // your code base. For this to work, you need to set the
  // WEB3STORAGE_TOKEN environment variable before you run your code.
  return process.env.WEB3STORAGE_TOKEN;
}

class Twitter extends Adapter {
  constructor(credentials, db, maxRetry) {
    super(credentials, maxRetry);
    this.credentials = credentials;
    this.db = new Data('db', []);
    this.db.intializeData();
    this.proofs = new Data('proofs', []);
    this.proofs.intializeData();
    this.cids = new Data('cids', []);
    this.cids.intializeData();
    this.toCrawl = [];
    this.parsed = {};
    this.lastSessionCheck = null;
    this.sessionValid = false;
    this.browser = null;
  }

  checkSession = async () => {
    // this function should check if a session is still valid, and negotiate a new session if not
    // we should only negotiate a new session if the last session is more than 1 minute old, or return an error
    // if the session is still valid, return true
    if (this.sessionValid) {
      return true;
    } else if (Date.now() - this.lastSessionCheck > 60000) {
      await this.negotiateSession();
      return true;
    } else {
      return false; 
    }
  };

  negotiateSession = async () => {
    const options = {};
    const stats = await PCR(options);

    // const browserFetcher = await puppeteer.createBrowserFetcher({
    //   product: 'chrome',
    // });
    // const browserRevision = '533271';
    // let revisionInfo = await browserFetcher.download(browserRevision);
    // this.browser = await puppeteer.launch({
    //   executablePath: revisionInfo.executablePath,
    //   headless: false, // other options can be included here
    // });

    this.browser = await stats.puppeteer.launch({ 
      headless: false,
      executablePath: stats.executablePath 
    });

    console.log('Step: Open new page');
    this.page = await this.browser.newPage();
    
    // Enable console logs in the context of the page
    // this.page.on('console', consoleObj => console.log('cccc', consoleObj.text()));
    await this.page.setViewport({ width: 1920, height: 1000 });
    await this.twitterLogin();
  };

  twitterLogin = async () => {
    console.log('Step: Go to twitter.com');
    console.log('isBrowser?', this.browser, 'isPage?', this.page);
    await this.page.goto('https://twitter.com');
    // Wait 1 second before scraping
    // await this.page.waitForTimeout(1000);
    console.log('Step: Go to login page');
    await this.page.goto('https://twitter.com/i/flow/login');
    // Wait an additional 5 seconds before scraping
    // await this.page.waitForTimeout(5000);

    console.log('Step: Fill in username');

    console.log(this.credentials.username);
    await this.page.waitForSelector('input[autocomplete="username"]');
    await this.page.type(
      'input[autocomplete="username"]',
      this.credentials.username,
    );
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
    // TODO - add case for failed login handling here (e.g. wrong password) - DO NOT set following session params if failed

    this.sessionValid = true;
    this.lastSessionCheck = Date.now();

    console.log('Step: Login successful');

  };

  getSubmissionCID = async round => {
    if (this.proofs) {
      // check if the cid has already been stored
      let proof_cid = await this.proofs.getItem(round);
      console.log('got proofs item', proof_cid);
      if (proof_cid) {
        console.log('returning proof cid A', proof_cid);
        return proof_cid;
      } else {
        // we need to upload proofs for that round and then store the cid
        const data = await this.cids.getList({ round: round });
        console.log(`got cids list for round ${round}`, data);
        const file = await makeFileFromObjectWithName(data, 'round:' + round);
        const cid = await storeFiles([file]);
        await this.proofs.create({
          round: round,
          cid: cid,
        });
        console.log('returning proof cid B', cid);
        return cid;
      }
    } else {
      throw new Error('No proofs database provided');
    }
  };

  parseItem = async (url, query) => {
    if (!this.sessionValid) {
      await this.negotiateSession();
    }
    await this.page.setViewport({ width: 1920, height: 10000 });
    console.log('PARSE: ' + url, query);
    await this.page.goto(url);
    await this.page.waitForTimeout(2000);

    console.log('PARSE: ' + url);
    const html = await this.page.content();
    const $ = cheerio.load(html);
    let data = {};
    var count = 0;

    const articles = $('article[data-testid="tweet"]').toArray();

    const el = articles[0];
    const tweet_text = $(el).find('div[data-testid="tweetText"]').text();
    const tweet_user = $(el).find('a[tabindex="-1"]').text();
    const tweet_record = $(el).find(
      'span[data-testid="app-text-transition-container"]',
    );
    const commentCount = tweet_record.eq(0).text();
    const likeCount = tweet_record.eq(1).text();
    const shareCount = tweet_record.eq(2).text();
    const viewCount = tweet_record.eq(3).text();
    if (tweet_user && tweet_text) {
      data = {
        user: tweet_user,
        content: tweet_text.replace(/\n/g, '<br>'),
        comment: commentCount,
        like: likeCount,
        share: shareCount,
        view: viewCount,
      };
    }
    // TODO  - queue users to be crawled?

    if (query) {
      articles.slice(1).forEach(async el => {
        const tweet_user = $(el).find('a[tabindex="-1"]').text();
        // console.log("GETTING COMMENTS");
        // console.log(tweet_user);

        let newQuery = `https://twitter.com/search?q=${encodeURIComponent(
          tweet_user,
        )}%20${query.searchTerm}&src=typed_query`;
        if (query.isRecursive)
          this.toCrawl.push(await this.fetchList(newQuery));
      });
    }

    return data;
  };

  // parse all the comments
  // then queue the

  crawl = async query => {
    this.toCrawl = await this.fetchList(query.query);
    console.log('round is', query.round, query.updateRound);
    console.log(`about to crawl ${this.toCrawl.length} items`);
    this.parsed = []; // adding this to get it to start the while loop
    let cids = [];
    console.log(
      'test',
      this.parsed.length < query.limit,
      this.parsed.length,
      query.limit,
    );
    while (this.parsed.length < query.limit && !this.break) {
      // console.log('entered while loop')
      let round = await query.updateRound();
      // console.log('round is ', round)
      const url = this.toCrawl.shift();
      // console.log(`about to crawl ${url}`)
      if (url) {
        var data = await this.parseItem(url, query);
        this.parsed[url] = data;

        const file = await makeFileFromObjectWithName(data, url);
        const cid = await storeFiles([file]);
        this.cids.create({
          id: url,
          round: round || 0,
          cid: cid,
        });
        
        if (query.recursive === true) {
          const newLinks = await this.fetchList(url);
          this.toCrawl = this.toCrawl.concat(newLinks);
        }
      } else {
        // console.log('no url', url)
      }
    }
    // return cids; // no need to return these here
  };

  fetchList = async url => {
    console.log('fetching list for ', url);

    // Go to the hashtag page
    await this.page.waitForTimeout(1000);
    await this.page.setViewport({ width: 1920, height: 10000 });
    await this.page.goto(url, );

    // Wait an additional 5 seconds until fully loaded before scraping
    await this.page.waitForTimeout(5000);
    // Scrape the tweets

    let scrapingData = {};

    const html = await this.page.content();
    const $ = cheerio.load(html);

    const links = $('a').toArray();

    console.log(`got ${links.length} links`);

    // Filter the matching elements with the specified pattern
    const matchedLinks = links.filter(link => {
      const href = $(link).attr('href');
      const regex = /\/status\/\d+[^/]*$/;
      return regex.test(href);
    });

    const linkStrings = [];
    matchedLinks.forEach(link => {
      linkStrings.push('https://twitter.com' + $(link).attr('href'));
    });

    const uniqueLinks = getUnique(linkStrings);
    uniqueLinks.forEach(link => {
      console.log('fetchlist link:', link);
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

  processLinks = async links => {
    links.forEach(link => {});
  };

  checkSession = async () => {
    return true;
  };

  stop = async () => {
    return (this.break = true);
  };

  newSearch = async query => {};
}

module.exports = Twitter;

// TODO - move the following functions to a utils file?

function makeStorageClient() {
  return new Web3Storage({ token: getAccessToken() });
}

async function makeFileFromObjectWithName(obj, name) {
  console.log('making file from', obj, name);
  obj.url = name;
  const buffer = Buffer.from(JSON.stringify(obj));
  console.log('buffer is', buffer);
  return new File([buffer], 'data.json', { type: 'application/json' });
}

async function storeFiles(files) {
  const client = makeStorageClient();
  const cid = await client.put(files);
  console.log('stored files with cid:', cid);
  return cid;
}

// TODO - use this properly as a sub-flow in this.parseItem()
const parseTweet = async tweet => {
  // console.log('new tweet!', tweet)
  let item = {
    id: tweet.id,
    data: tweet,
    list: getIdListFromTweet(tweet),
  };

  return item;
};

const getIdListFromTweet = tweet => {
  // parse the tweet for IDs from comments and replies and return an array

  return [];
};

function getUnique(array) {
  return [...new Set(array)];
}

function idFromUrl(url, round) {
  return round + ':' + url;
}
