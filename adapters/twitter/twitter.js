// Import required modules
const Adapter = require('../../model/adapter');
const puppeteer = require('puppeteer');
const PCR = require('puppeteer-chromium-resolver');
const cheerio = require('cheerio');
var crypto = require('crypto');
const { Web3Storage, File } = require('web3.storage');
const Data = require('../../model/data');

/**
 * Twitter
 * @class
 * @extends Adapter
 * @description
 * Provides a crawler interface for the data gatherer nodes to use to interact with twitter
 */

class Twitter extends Adapter {
  constructor(credentials, db, maxRetry) {
    super(credentials, maxRetry);
    this.credentials = credentials;
    this.db = new Data('db', []);
    this.db.initializeData();
    this.proofs = new Data('proofs', []);
    this.proofs.initializeData();
    this.cids = new Data('cids', []);
    this.cids.initializeData();
    this.toCrawl = [];
    this.parsed = {};
    this.lastSessionCheck = null;
    this.sessionValid = false;
    this.browser = null;
  }

  /**
   * checkSession
   * @returns {Promise<boolean>}
   * @description
   * 1. Check if the session is still valid
   * 2. If the session is still valid, return true
   * 3. If the session is not valid, check if the last session check was more than 1 minute ago
   * 4. If the last session check was more than 1 minute ago, negotiate a new session
   */
  checkSession = async () => {
    if (this.sessionValid) {
      return true;
    } else if (Date.now() - this.lastSessionCheck > 60000) {
      await this.negotiateSession();
      return true;
    } else {
      return false;
    }
  };

  /**
   * negotiateSession
   * @returns {Promise<void>}
   * @description
   * 1. Get the path to the Chromium executable
   * 2. Launch a new browser instance
   * 3. Open a new page
   * 4. Set the viewport size
   * 5. Queue twitterLogin()
   */
  negotiateSession = async () => {
    const options = {};
    const stats = await PCR(options);
    console.log(
      '*****************************************CALLED PURCHROMIUM RESOLVER*****************************************',
    );
    this.browser = await stats.puppeteer.launch({
      headless: false,
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      args: ['--disable-gpu'],
      executablePath: stats.executablePath,
    });

    console.log('Step: Open new page');
    this.page = await this.browser.newPage();
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    );
    // TODO - Enable console logs in the context of the page and export them for diagnostics here
    await this.page.setViewport({ width: 1024, height: 768 });
    await this.twitterLogin();

    return true;
  };

  /**
   * twitterLogin
   * @returns {Promise<void>}
   * @description
   * 1. Go to twitter.com
   * 2. Go to login page
   * 3. Fill in username
   * 4. Fill in password
   * 5. Click login
   * 6. Wait for login to complete
   * 7. Check if login was successful
   * 8. If login was successful, return true
   * 9. If login was unsuccessful, return false
   * 10. If login was unsuccessful, try again
   */
  twitterLogin = async () => {
    console.log('Step: Go to twitter.com');
    // console.log('isBrowser?', this.browser, 'isPage?', this.page);
    await this.page.goto('https://twitter.com');

    console.log('Step: Go to login page');
    await this.page.goto('https://twitter.com/i/flow/login');

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
    const currentURL = await this.page.url();
    await this.page.waitForSelector('input[name="password"]');
    await this.page.type('input[name="password"]', this.credentials.password);
    console.log('Step: Click login button');
    await this.page.keyboard.press('Enter');

    // TODO - catch unsuccessful login and retry up to query.maxRetry
    if (!(await this.isPasswordCorrect(this.page, currentURL))) {
      console.log('Password is incorrect.');
      this.sessionValid = false;
    } else if (await this.isEmailVerificationRequired(this.page)) {
      console.log('Email verification required.');
      this.sessionValid = false;
      await this.page.waitForTimeout(1000000);
    } else {
      console.log('Password is correct.');
      this.page.waitForNavigation({ waitUntil: 'load' });
      await this.page.waitForTimeout(1000);

      this.sessionValid = true;
      this.lastSessionCheck = Date.now();

      console.log('Step: Login successful');
    }

    return this.sessionValid;
  };

  isPasswordCorrect = async (page, currentURL) => {
    await this.page.waitForTimeout(2000);

    const newURL = await this.page.url();
    if (newURL === currentURL) {
      return false;
    }
    return true;
  };

  isEmailVerificationRequired = async page => {
    // Wait for some time to allow the page to load the required elements
    await page.waitForTimeout(2000);

    // Check if the specific text is present on the page
    const textContent = await this.page.evaluate(
      () => document.body.textContent,
    );
    return textContent.includes(
      'Verify your identity by entering the email address associated with your X account.',
    );
  };

  /**
   * getSubmissionCID
   * @param {string} round - the round to get the submission cid for
   * @returns {string} - the cid of the submission
   * @description - this function should return the cid of the submission for the given round
   * if the submission has not been uploaded yet, it should upload it and return the cid
   */
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

        if (data && data.length === 0) {
          throw new Error('No cids found for round ' + round);
          return null;
        } else {
          const file = await makeFileFromObjectWithName(data, 'round:' + round);
          const cid = await storeFiles([file]);

          await this.proofs.create({
            id: 'proof:' + round,
            proof_round: round,
            proof_cid: cid,
          }); // TODO - add better ID structure here

          console.log('returning proof cid B', cid);
          return cid;
        }
      }
    } else {
      throw new Error('No proofs database provided');
    }
  };

  /**
   * parseItem
   * @param {string} url - the url of the item to parse
   * @param {object} query - the query object to use for parsing
   * @returns {object} - the parsed item
   * @description - this function should parse the item at the given url and return the parsed item data
   *               according to the query object and for use in either crawl() or validate()
   */
  parseItem = async (url, query) => {
    if (this.sessionValid == false) {
      await this.negotiateSession();
    }

    await this.page.setViewport({ width: 1024, height: 768 });

    console.log('PARSE: ' + url, query);
    await this.page.goto(url);
    await this.page.waitForTimeout(2000);

    console.log('PARSE: ' + url);
    const tweets_id = url.match(/status\/(\d+)/)[1];
    const html = await this.page.content();
    const $ = cheerio.load(html);
    let data = {};
    var count = 0;

    const articles = $('article[data-testid="tweet"]').toArray();

    const el = articles[0];
    const screen_name = $(el).find('a[tabindex="-1"]').text();
    const allText = $(el).find('a[role="link"]').text();
    const user_name = allText.split('@')[0];
    console.log('user_name', user_name);
    const user_url =
      'https://twitter.com' + $(el).find('a[role="link"]').attr('href');
    const user_img = $(el).find('img[draggable="true"]').attr('src');

    const tweet_text = $(el)
      .find('div[data-testid="tweetText"]')
      .first()
      .text();

    const outerMediaElements = $(el).find('div[data-testid="tweetText"] a');

    const outer_media_urls = [];
    const outer_media_short_urls = [];

    outerMediaElements.each(function () {
      const fullURL = $(this).attr('href');
      const shortURL = $(this).text().replace(/\s/g, '');

      // Ignore URLs containing "/search?q=" or "twitter.com"
      if (
        fullURL &&
        !fullURL.includes('/search?q=') &&
        !fullURL.includes('twitter.com') &&
        !fullURL.includes('/hashtag/')
      ) {
        outer_media_urls.push(fullURL);
        outer_media_short_urls.push(shortURL);
      }
    });

    const timeRaw = $(el).find('time').attr('datetime');
    const time = await this.convertToTimestamp(timeRaw);
    const tweet_record = $(el).find(
      'span[data-testid="app-text-transition-container"]',
    );
    const commentCount = tweet_record.eq(0).text();
    const likeCount = tweet_record.eq(1).text();
    const shareCount = tweet_record.eq(2).text();
    const viewCount = tweet_record.eq(3).text();
    if (screen_name && tweet_text) {
      data = {
        user_name: user_name,
        screen_name: screen_name,
        user_url: user_url,
        user_img: user_img,
        tweets_id: tweets_id,
        tweets_url: url,
        tweets_content: tweet_text.replace(/\n/g, '<br>'),
        time: time,
        comment: commentCount,
        like: likeCount,
        share: shareCount,
        view: viewCount,
        outer_media_url: outer_media_urls,
        outer_media_short_url: outer_media_short_urls,
      };
    }
    // await this.page.waitForTimeout(99999999);
    // TODO  - queue users to be crawled?

    if (query) {
      // get the comments and other attached tweet items and queue them
      articles.slice(1).forEach(async el => {
        const user_name = $(el).find('a[tabindex="-1"]').text();
        let newQuery = `https://twitter.com/search?q=${encodeURIComponent(
          user_name,
        )}%20${query.searchTerm}&src=typed_query`;
        if (query.isRecursive)
          this.toCrawl.push(await this.fetchList(newQuery));
      });
    }

    return data;
  };

  convertToTimestamp = async dateString => {
    const date = new Date(dateString);
    return Math.floor(date.getTime() / 1000);
  };

  /**
   * crawl
   * @param {string} query
   * @returns {Promise<string[]>}
   * @description Crawls the queue of known links
   */
  crawl = async query => {
    this.toCrawl = await this.fetchList(query.query);
    console.log('round is', query.round, query.updateRound);
    console.log(`about to crawl ${this.toCrawl.length} items`);
    this.parsed = [];

    console.log(
      'test',
      this.parsed.length < query.limit,
      this.parsed.length,
      query.limit,
    );

    while (this.parsed.length < query.limit && !this.break) {
      let round = await query.updateRound();
      const url = this.toCrawl.shift();
      if (url) {
        var data = await this.parseItem(url, query);
        this.parsed[url] = data;

        console.log('got tweet item', data);

        const file = await makeFileFromObjectWithName(data, url);
        // const cid = await storeFiles([file]);
        const cid = 'testcid'
        this.cids.create({
          id: url,
          round: round || 0,
          cid: cid,
        });

        if (query.recursive === true) {
          const newLinks = await this.fetchList(url);
          this.toCrawl = this.toCrawl.concat(newLinks);
        }
      }
    }
  };

  /**
   * fetchList
   * @param {string} url
   * @returns {Promise<string[]>}
   * @description Fetches a list of links from a given url
   */
  fetchList = async url => {
    console.log('fetching list for ', url);

    // Go to the hashtag page
    await this.page.waitForTimeout(1000);
    await this.page.setViewport({ width: 1024, height: 7768 });
    await this.page.goto(url);

    // Wait an additional 5 seconds until fully loaded before scraping
    await this.page.waitForTimeout(5000);

    // Scrape the tweets
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
  };

  /**
   * processLinks
   * @param {string[]} links
   * @returns {Promise<void>}
   * @description Processes a list of links
   * @todo Implement this function
   * @todo Implement a way to queue links
   */
  processLinks = async links => {
    links.forEach(link => {});
  };

  /**
   * stop
   * @returns {Promise<boolean>}
   * @description Stops the crawler
   */
  stop = async () => {
    return (this.break = true);
  };
}

module.exports = Twitter;

// TODO - move the following functions to a utils file?
function makeStorageClient() {
  return new Web3Storage({ token: getAccessToken() });
}

async function makeFileFromObjectWithName(obj, name) {
  // console.log('making file from', typeof obj, name);
  obj.url = name;
  const buffer = Buffer.from(JSON.stringify(obj));
  // console.log('buffer is', buffer);
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
