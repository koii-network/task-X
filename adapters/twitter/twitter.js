// Import required modules
const Adapter = require('../../model/adapter');
const cheerio = require('cheerio');
// const { SpheronClient, ProtocolEnum } = require('@spheron/storage');
const { KoiiStorageClient } = require('@_koii/storage-task-sdk');
const rimraf = require('rimraf');
const Data = require('../../model/data');
const PCR = require('puppeteer-chromium-resolver');
const { namespaceWrapper } = require('../../namespaceWrapper');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

/**
 * Twitter
 * @class
 * @extends Adapter
 * @description
 * Provides a searcher interface for the data gatherer nodes to use to interact with twitter
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
    this.toSearch = [];
    this.searchTerm = [];
    this.parsed = {};
    this.lastSessionCheck = null;
    this.sessionValid = false;
    this.browser = null;
    this.w3sKey = null;
    this.round = null;
    this.maxRetry = maxRetry;
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
    } else if (Date.now() - this.lastSessionCheck > 50000) {
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
    try {
      if (this.browser) {
        await this.browser.close();
        console.log('Old browser closed');
      }
      const options = {};
      const userDataDir = path.join(__dirname, 'puppeteer_cache_koii_twitter_archive');
      const stats = await PCR(options);
      console.log(
        '*****************************************CALLED PURCHROMIUM RESOLVER*****************************************',
      );
      this.browser = await stats.puppeteer.launch({
        executablePath: stats.executablePath,
        userDataDir: userDataDir,
        // headless: false,
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        args: [
          '--aggressive-cache-discard',
          '--disable-cache',
          '--disable-application-cache',
          '--disable-offline-load-stale-cache',
          '--disable-gpu-shader-disk-cache',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-gpu',
        ],
      });
      console.log('Step: Open new page');
      this.page = await this.browser.newPage();
      await this.page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      );
      await this.page.setViewport({ width: 1920, height: 1080 });
      await this.twitterLogin();
      return true;
    } catch (e) {
      console.log('Error negotiating session', e);
      return false;
    }
  };

  /**
   * twitterLogin
   * @returns {Promise<void>}
   * @description
   * 1. Go to x.com
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
    let currentAttempt = 0;
    const cookieLoginSuccess = await this.tryLoginWithCookies();
    if (cookieLoginSuccess) {
      this.sessionValid = true;
      return this.sessionValid;
    }
    while (currentAttempt < this.maxRetry && !this.sessionValid) {
      try {
        console.log(currentAttempt, this.maxRetry);
        console.log('Step: Go to login page');
        await this.page.goto('https://x.com/i/flow/login', {
          timeout: await this.randomDelay(60000),
          waitUntil: 'networkidle0',
        });
        let basePath = '';
        basePath = await namespaceWrapper.getBasePath();
        console.log('Waiting for login page to load');

        // Retrieve the outer HTML of the body element
        const bodyHTML = await this.page.evaluate(
          () => document.body.outerHTML,
        );

        // Write the HTML to a file
        fs.writeFileSync(`${basePath}/bodyHTML.html`, bodyHTML);

        await this.page.waitForSelector('input', {
          timeout: await this.randomDelay(60000),
        });
        // Select the div element by its aria-labelledby attribute
        const usernameHTML = await this.page.$eval('input', el => el.outerHTML);

        // Use fs module to write the HTML to a file
        fs.writeFileSync(`${basePath}/usernameHTML.html`, usernameHTML);

        await this.page.waitForSelector('input[name="text"]', {
          timeout: await this.randomDelay(60000),
        });

        console.log('Step: Fill in username');
        console.log(this.credentials.username);

        await this.page.type('input[name="text"]', this.credentials.username);
        await this.page.keyboard.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 10000));

        const twitter_verify = await this.page
          .waitForSelector('input[data-testid="ocfEnterTextTextInput"]', {
            timeout: await this.randomDelay(5000),
            visible: true,
          })
          .then(() => true)
          .catch(() => false);

        if (twitter_verify) {
          const verifyURL = await this.page.url();
          console.log('Twitter verify needed, trying phone number');
          console.log('Step: Fill in phone number');
          await this.page.type(
            'input[data-testid="ocfEnterTextTextInput"]',
            this.credentials.phone,
          );
          await this.page.keyboard.press('Enter');

          if (!(await this.checkLogin())) {
            console.log(
              'Phone number is incorrect or email verification needed.',
            );
            await this.page.waitForTimeout(await this.randomDelay(8000));
            this.sessionValid = false;
            process.exit(1);
          } else if (await this.isEmailVerificationRequired(this.page)) {
            console.log('Email verification required.');
            this.sessionValid = false;
            await this.page.waitForTimeout(await this.randomDelay(1000000));
            process.exit(1);
          }
           // add delay
           await new Promise(resolve => setTimeout(resolve, 3000));
        }

        const currentURL = await this.page.url();

        // Select the div element by its aria-labelledby attribute
        const passwordHTML = await this.page.$$eval('input', elements =>
          elements.map(el => el.outerHTML).join('\n'),
        );

        // Use fs module to write the HTML to a file
        fs.writeFileSync(`${basePath}/passwordHTML.html`, passwordHTML);

        await this.page.waitForSelector('input[name="password"]');
        console.log('Step: Fill in password');
        await this.page.type(
          'input[name="password"]',
          this.credentials.password,
        );
        console.log('Step: Click login button');
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(await this.randomDelay(3000));
        if (!(await this.checkLogin())) {
          console.log('Password is incorrect or email verification needed.');
          await this.page.waitForTimeout(await this.randomDelay(5000));
          this.sessionValid = false;
          process.exit(1);
        } else if (await this.isEmailVerificationRequired(this.page)) {
          console.log('Email verification required.');
          this.sessionValid = false;
          await this.page.waitForTimeout(await this.randomDelay(10000));
          process.exit(1);
        } else {
          console.log('Password is correct.');
          this.page.waitForNavigation({ waitUntil: 'load' });
          await this.page.waitForTimeout(await this.randomDelay(10000));

          this.sessionValid = true;
          this.lastSessionCheck = Date.now();

          console.log('Step: Login successful');

          // Extract cookies
          const cookies = await this.page.cookies();
          // console.log('cookies', cookies);
          // Save cookies to database
          await this.saveCookiesToDB(cookies);
        }
        return this.sessionValid;
      } catch (e) {
        console.log(
          `Error logging in, retrying ${currentAttempt + 1} of ${
            this.maxRetry
          }`,
          e,
        );
        currentAttempt++;

        if (currentAttempt === this.maxRetry) {
          console.log('Max retry reached, exiting');
          process.exit(1);
        }
      }
    }
  };

  tryLoginWithCookies = async () => {
    const cookies = await this.db.getCookie();
    // console.log('cookies', cookies);
    if (cookies !== null) {
      await this.page.setCookie(...cookies);

      await this.page.goto('https://x.com/home');

      await this.page.waitForTimeout(await this.randomDelay(5000));

      // Replace the selector with a Twitter-specific element that indicates a logged-in state
      // This is just an example; you'll need to determine the correct selector for your case
      const isLoggedIn =
        (await this.page.url()) !==
        'https://x.com/i/flow/login?redirect_after_login=%2Fhome';

      if (isLoggedIn) {
        console.log('Logged in using existing cookies');
        console.log('Updating last session check');
        const cookies = await this.page.cookies();
        this.saveCookiesToDB(cookies);
        this.sessionValid = true;
        // Optionally, refresh or validate cookies here
      } else {
        console.log('No valid cookies found, proceeding with manual login');
        this.sessionValid = false;
      }
      return this.sessionValid;
    } else {
      console.log('No cookies found');
      return false;
    }
  };
  createNewPage = async () => {
    //attemp 3 times to create new page
    let currentAttempt = 0;
    while (currentAttempt < 3) {
      try {
        const newPage = await this.browser.newPage();
        return newPage;
      } catch (e) {
        console.log('Error creating new page', e);
        currentAttempt++;
      }
    }
    return null;
  };
  checkLogin = async () => {  

    const newPage = await this.browser.newPage(); // Create a new page
    await newPage.goto('https://x.com/home');
    await newPage.waitForTimeout(await this.randomDelay(5000));
    // Replace the selector with a Twitter-specific element that indicates a logged-in state
    const isLoggedIn =
      (await newPage.url()) !==
      'https://x.com/i/flow/login?redirect_after_login=%2Fhome';
    if (isLoggedIn) {
      console.log('Logged in using existing cookies');
      console.log('Updating last session check');
      this.sessionValid = true;
    } else {
      console.log('No valid cookies found, proceeding with manual login');
      this.sessionValid = false;
    }
    return this.sessionValid;

  };
  
  saveCookiesToDB = async cookies => {
    try {
      const data = await this.db.getCookie();
      // console.log('data', data);
      if (data) {
        await this.db.updateCookie({ id: 'cookies', data: cookies });
      } else {
        await this.db.createCookie({ id: 'cookies', data: cookies });
      }
    } catch (e) {
      console.log('Error saving cookies to database', e);
    }
  };

  // isPasswordCorrect = async (page, currentURL) => {
  //   await this.page.waitForTimeout(8000);

  //   const newURL = await this.page.url();
  //   if (newURL === currentURL) {
  //     return false;
  //   }
  //   return true;
  // };

  isEmailVerificationRequired = async page => {
    // Wait for some time to allow the page to load the required elements
    await page.waitForTimeout(await this.randomDelay(5000));

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
      // we need to upload proofs for that round and then store the cid
      const data = await this.cids.getList({ round: round });
      console.log(`got cids list for round ${round}`);

      if (data && data.length === 0) {
        console.log('No cids found for round ' + round);
        return null;
      } else {
        let proof_cid;
        let path = `dataList.json`;
        let basePath = '';
        try {
          basePath = await namespaceWrapper.getBasePath();
          fs.writeFileSync(`${basePath}/${path}`, JSON.stringify(data));
        } catch (err) {
          console.log(err);
        }
        try {
          const client = new KoiiStorageClient(undefined, undefined, false);
          const userStaking = await namespaceWrapper.getSubmitterAccount();
          console.log(`Uploading ${basePath}/${path}`);
          const fileUploadResponse = await client.uploadFile(
            `${basePath}/${path}`,
            userStaking,
          );
          console.log(`Uploaded ${basePath}/${path}`);
          const cid = fileUploadResponse.cid;
          proof_cid = cid;
          await this.proofs.create({
            id: 'proof:' + round,
            proof_round: round,
            proof_cid: proof_cid,
          });

          console.log('returning proof cid for submission', proof_cid);
          return proof_cid;
        } catch (error) {
          if (error.message === 'Invalid Task ID') {
            console.error('Error: Invalid Task ID');
          } else {
            console.error('An unexpected error occurred:', error);
          }
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
   *               according to the query object and for use in either search() or validate()
   */
  parseItem = async item => {
    if (this.sessionValid == false) {
      await this.negotiateSession();
    }
    try {
      const $ = cheerio.load(item);
      let data = {};

      const articles = $('article[data-testid="tweet"]').toArray();
      const el = articles[0];
      const tweetUrl = $('a[href*="/status/"]').attr('href');
      const tweetId = tweetUrl.split('/').pop();
      const screen_name = $(el).find('a[tabindex="-1"]').text();
      const allText = $(el).find('a[role="link"]').text();
      const user_name = allText.split('@')[0];
      // console.log('user_name', user_name);
      const user_url =
        'https://x.com' + $(el).find('a[role="link"]').attr('href');
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

        // Ignore URLs containing "/search?q=" or "x.com"
        if (
          fullURL &&
          !fullURL.includes('/search?q=') &&
          !fullURL.includes('twitter.com') &&
          !fullURL.includes('x.com') &&
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
      const tweets_content = tweet_text.replace(/\n/g, '<br>');
      const originData = tweets_content;
      const saltRounds = 10;
      const salt = bcrypt.genSaltSync(saltRounds);
      const hash = bcrypt.hashSync(originData, salt);
      if (screen_name && tweet_text) {
        data = {
          user_name: user_name,
          screen_name: screen_name,
          user_url: user_url,
          user_img: user_img,
          tweets_id: tweetId,
          tweets_content: tweets_content,
          time_post: time,
          time_read: Date.now(),
          comment: commentCount,
          like: likeCount,
          share: shareCount,
          view: viewCount,
          outer_media_url: outer_media_urls,
          outer_media_short_url: outer_media_short_urls,
          keyword: this.searchTerm,
          hash: hash,
        };
      }
      return data;
    } catch (e) {
      console.log(
        'Filtering advertisement tweets; continuing to the next item.',
      );
    }
  };

  convertToTimestamp = async dateString => {
    const date = new Date(dateString);
    return Math.floor(date.getTime() / 1000);
  };

  /**
   * search
   * @param {string} query
   * @returns {Promise<string[]>}
   * @description searchs the queue of known links
   */
  search = async query => {
    console.log('valid? ', this.sessionValid);
    if (this.sessionValid == true) {
      this.searchTerm = query.searchTerm;
      this.round = query.round;
      await this.fetchList(query.query, query.round);
    } else {
      await this.negotiateSession();
    }
  };

  /**
   * fetchList
   * @param {string} url
   * @returns {Promise<string[]>}
   * @description Fetches a list of links from a given url
   */
  fetchList = async (url, round) => {
    try {
      console.log('fetching list for ', url);
      // Go to the hashtag page
      await this.page.waitForTimeout(await this.randomDelay(5000));
      await this.page.setViewport({ width: 1024, height: 4000 });
      await this.page.goto(url);

      // Wait an additional 5 seconds until fully loaded before scraping
      await this.page.waitForTimeout(await this.randomDelay(5000));

      let i = 0;
      while (true) {
        i++;
        // Check if the error message is present on the page inside an article element
        const errorMessage = await this.page.evaluate(() => {
          const elements = document.querySelectorAll('div[dir="ltr"]');
          for (let element of elements) {
            console.log(element.textContent);
            if (
              element.textContent === 'Something went wrong. Try reloading.'
            ) {
              return true;
            }
          }
          return false;
        });

        // Archive the tweets
        const items = await this.page.evaluate(() => {
          const elements = document.querySelectorAll(
            'article[aria-labelledby]',
          );
          return Array.from(elements).map(element => element.outerHTML);
        });
        console.log(items.length);
        for (const item of items) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Adds a 1-second delay
          try {
            let data = await this.parseItem(item);
            // console.log(data);
            if (data.tweets_id) {
              // Check if id exists in database
              let checkItem = {
                id: data.tweets_id,
              };
              const existingItem = await this.db.getItem(checkItem);
              if (!existingItem) {
                // Store the item in the database
                // const cid = await storeFiles(data, this.w3sKey);
                // const cid = 'testcid';
                this.cids.create({
                  id: data.tweets_id,
                  round: round,
                  data: data,
                });
              }
            }
          } catch (e) {
            console.log(
              'Filtering advertisement tweets; continuing to the next item.',
            );
          }
        }

        try {
          let dataLength = (await this.cids.getList({ round: round })).length;
          console.log(
            'Already Archived',
            dataLength,
            'and',
            i,
            'times in round',
            round,
          );
          if (dataLength > 120 || i > 4) {
            console.log('reach maixmum data per round. Closed old browser');
            this.browser.close();
            break;
          }
          // Scroll the page for next batch of elements
          await this.scrollPage(this.page);

          // Optional: wait for a moment to allow new elements to load
          await this.page.waitForTimeout(await this.randomDelay(5000));

          // Refetch the elements after scrolling
          await this.page.evaluate(() => {
            return document.querySelectorAll('article[aria-labelledby]');
          });
        } catch (e) {
          console.log('round check error', e);
        }
        // If the error message is found, wait for 2 minutes, refresh the page, and continue
        if (errorMessage) {
          console.log('Rate limit reach, waiting for next round...');
          this.browser.close();
          break;
        }
      }
      return;
    } catch (e) {
      console.log('Last round fetching list stop');
      return;
    }
  };


  
  compareHash = async (data, saltRounds) => {
      const dataToCompare =
        data.data.tweets_content; // + data.data.tweets_id;
      console.log(dataToCompare);
      const salt = bcrypt.genSaltSync(saltRounds);
      const hash = bcrypt.hashSync(dataToCompare, salt);
      console.log(hash);
      const hashCompare = bcrypt.compareSync(dataToCompare, hash);
      console.log(hashCompare);
      const hashCompareWrong = bcrypt.compareSync(data.data.tweets_id, hash);
      console.log(hashCompareWrong);
  };
  
 /**
   * retrieveItem derived from fetchList 
   * @param {*} url 
   * @param {*} item 
   * @returns 
   */
  retrieveItem = async (verify_page, tweetid) => {
    try {

      let i = 0;
      while (true) {
        i++;
        // Check if the error message is present on the page inside an article element
        const errorMessage = await verify_page.evaluate(() => {
          const elements = document.querySelectorAll('div[dir="ltr"]');
          for (let element of elements) {
           
            if (
              element.textContent === 'Something went wrong. Try reloading.'
            ) {
              return true;
            }
          }
          return false;
        });

        // Archive the tweets
        const items = await verify_page.evaluate(() => {
          
          const elements = document.querySelectorAll(
            'article[aria-labelledby]',
          );
          return Array.from(elements).map(element => element.outerHTML);
        });
        let temp = null;
        // Reason why many tweets: The given link might contain a main tweet and its comments, and the input task id might be one of the comments task id
        for (const item of items) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Adds a 1-second delay
          try {
            let data = await this.parseItem(item);
            console.log(data);
            console.log(data.tweets_id);
            console.log(tweetid);
            if (data.tweets_id == tweetid) {
              return data;
            }else{
              console.log("tweets id diff, continue");
            }
            if (data.tweets_id == "1"){
              temp = data;
            }
          } catch (e) {
            console.log(e);
            console.log(
              'Filtering advertisement tweets; continuing to the next item.',
            );
          }
        }
        
        return temp;
      }
    } catch (e) {
      console.log('Last round fetching list stop', e);
      return;
    }
  };
  verify = async (tweetid, inputitem) => {
    console.log(inputitem);
    console.log("above is input item");
    try {
      const options = {};
      const userAuditDir = path.join(__dirname, 'puppeteer_cache_koii_twitter_archive_audit');
      const stats = await PCR(options);
      let auditBrowser = await stats.puppeteer.launch({
        executablePath: stats.executablePath,
        userDataDir: userAuditDir,
        // headless: false,
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        args: [
          '--aggressive-cache-discard',
          '--disable-cache',
          '--disable-application-cache',
          '--disable-offline-load-stale-cache',
          '--disable-gpu-shader-disk-cache',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-gpu',
        ],
      });
      const url = `https://twitter.com/any/status/${tweetid}`;
      const verify_page = await auditBrowser.newPage();
      await verify_page.goto(url, { timeout: 60000 });
      await verify_page.waitForTimeout(await this.randomDelay(5000));
      let confirmed_no_tweet = false;
      await verify_page.evaluate(() => {
        if (document.querySelector('[data-testid="error-detail"]')) {
          console.log('Error detail found');
          confirmed_no_tweet = true;
        }
      });

      if (confirmed_no_tweet) {
        return false; // Return false if error detail is found
      }
      console.log('retrieve item for ', url);
      const result = await this.retrieveItem(verify_page, tweetid);
      if (result){
        if (result.tweets_content != inputitem.tweets_content) {
          console.log("content not match", result.tweets_content, inputitem.tweets_content);
          auditBrowser.close();
          return false;
        }
        // if (result.time_post != inputitem.time_post) {
        //   console.log("time post not match", result.time_post, inputitem.time_post);
        //   auditBrowser.close();
        //   return false;
        // }
        if (result.time_read - inputitem.time_read > 3600000 * 15) {
          console.log("time read difference too big", result.time_read, inputitem.time_read);
          auditBrowser.close();
          return false;
        }
        const dataToCompare = result.tweets_content;
        const hashCompare = bcrypt.compareSync(dataToCompare, inputitem.hash);
        if(hashCompare==false){
          console.log("hash not match", dataToCompare, inputitem.hash);
          auditBrowser.close();
          return false;
        }
        auditBrowser.close();
        return true;
      }
      auditBrowser.close();
      return false; 
      
    } catch (e) {
      console.log('Error fetching single item', e);
      return false; // Return false in case of an exception
    }
  };
  
  
  scrollPage = async page => {
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });
    await page.waitForTimeout(5000); // Adjust the timeout as necessary
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



  randomDelay = async (delayTime) => {
    const delay = Math.floor(Math.random() * (delayTime - 2000 + 1)) + (delayTime - 2000);
    // console.log('Delaying for', delay, 'ms');
    return delay;
  }


  
  /**
   * stop
   * @returns {Promise<boolean>}
   * @description Stops the searcher
   */
  stop = async () => {
    if (this.browser) {
      await this.browser.close();
      console.log('Old browser closed');
    }
    return (this.break = true);
  };
}

module.exports = Twitter;
