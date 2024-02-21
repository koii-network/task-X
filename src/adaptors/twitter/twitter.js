// Import required modules
const CrawlerAdaptor = require('../crawler/crawler');
const cheerio = require('cheerio');
const { namespaceWrapper } = require('../../namespaceWrapper');
const fs = require('fs');

/**
 * TwitterAdaptor
 * @class
 * @extends CrawlerAdaptor
 * @description
 * Provides a crawler interface for the data gatherer nodes to use to interact with twitter
 */

class TwitterAdaptor extends CrawlerAdaptor {
  constructor(credentials, maxRetry) {
    super(credentials, maxRetry);
    this.toCrawl = [];
    this.searchTerm = [];
    this.parsed = {};
  }

  /**
   * Login
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
  login = async () => {
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
        await this.page.goto('https://twitter.com/i/flow/login', {
          timeout: 60000,
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
        fs.writeFileSync(`${basePath}/localData/bodyHTML.html`, bodyHTML);

        await this.page.waitForSelector('input', {
          timeout: 60000,
        });

        // Select the div element by its aria-labelledby attribute
        const usernameHTML = await this.page.$eval('input', el => el.outerHTML);

        // Use fs module to write the HTML to a file
        fs.writeFileSync(
          `${basePath}/localData/usernameHTML.html`,
          usernameHTML,
        );

        await this.page.waitForSelector('input[name="text"]', {
          timeout: 60000,
        });

        console.log('Step: Fill in username');
        console.log(this.credentials.username);

        await this.page.type('input[name="text"]', this.credentials.username);
        await this.page.keyboard.press('Enter');

        const twitter_verify = await this.page
          .waitForSelector('input[data-testid="ocfEnterTextTextInput"]', {
            timeout: 5000,
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

          if (!(await this.isPasswordCorrect(this.page, verifyURL))) {
            console.log(
              'Phone number is incorrect or email verfication needed.',
            );
            await this.page.waitForTimeout(8000);
            this.sessionValid = false;
            process.exit(1);
          } else if (await this.isEmailVerificationRequired(this.page)) {
            console.log('Email verification required.');
            this.sessionValid = false;
            await this.page.waitForTimeout(1000000);
            process.exit(1);
          }
        }

        const currentURL = await this.page.url();

        // Select the div element by its aria-labelledby attribute
        const passwordHTML = await this.page.$$eval('input', elements =>
          elements.map(el => el.outerHTML).join('\n'),
        );

        // Use fs module to write the HTML to a file
        fs.writeFileSync(
          `${basePath}/localData/passwordHTML.html`,
          passwordHTML,
        );

        await this.page.waitForSelector('input[name="password"]');
        console.log('Step: Fill in password');
        await this.page.type(
          'input[name="password"]',
          this.credentials.password,
        );
        console.log('Step: Click login button');
        await this.page.keyboard.press('Enter');

        if (!(await this.isPasswordCorrect(this.page, currentURL))) {
          console.log('Password is incorrect or email verfication needed.');
          await this.page.waitForTimeout(5000);
          this.sessionValid = false;
          process.exit(1);
        } else if (await this.isEmailVerificationRequired(this.page)) {
          console.log('Email verification required.');
          this.sessionValid = false;
          await this.page.waitForTimeout(10000);
          process.exit(1);
        } else {
          console.log('Password is correct.');
          this.page.waitForNavigation({ waitUntil: 'load' });
          await this.page.waitForTimeout(10000);

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

      await this.page.goto('https://twitter.com/home');

      await this.page.waitForTimeout(5000);

      // Replace the selector with a Twitter-specific element that indicates a logged-in state
      // This is just an example; you'll need to determine the correct selector for your case
      const isLoggedIn =
        (await this.page.url()) !==
        'https://twitter.com/i/flow/login?redirect_after_login=%2Fhome';

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

  isPasswordCorrect = async (page, currentURL) => {
    await this.page.waitForTimeout(8000);

    const newURL = await this.page.url();
    if (newURL === currentURL) {
      return false;
    }
    return true;
  };

  isEmailVerificationRequired = async page => {
    // Wait for some time to allow the page to load the required elements
    await page.waitForTimeout(5000);

    // Check if the specific text is present on the page
    const textContent = await this.page.evaluate(
      () => document.body.textContent,
    );
    return textContent.includes(
      'Verify your identity by entering the email address associated with your X account.',
    );
  };

  /**
   * parseItem
   * @param {string} url - the url of the item to parse
   * @param {object} query - the query object to use for parsing
   * @returns {object} - the parsed item
   * @description - this function should parse the item at the given url and return the parsed item data
   *               according to the query object and for use in either crawl() or validate()
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
          tweets_id: tweetId,
          tweets_content: tweet_text.replace(/\n/g, '<br>'),
          time_post: time,
          time_read: Date.now(),
          comment: commentCount,
          like: likeCount,
          share: shareCount,
          view: viewCount,
          outer_media_url: outer_media_urls,
          outer_media_short_url: outer_media_short_urls,
          keyword: this.searchTerm,
        };
      }
      return data;
    } catch (e) {
      console.log(
        'Filtering advertisement tweets; continuing to the next item.',
      );
    }
  };

  /**
   * crawl
   * @param {string} query
   * @returns {Promise<string[]>}
   * @description Crawls the queue of known links
   */
  crawl = async query => {
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
      await this.page.waitForTimeout(5000);
      await this.page.setViewport({ width: 1024, height: 4000 });
      await this.page.goto(url);

      // Wait an additional 5 seconds until fully loaded before scraping
      await this.page.waitForTimeout(5000);

      while (true) {
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

        // Scrape the tweets
        const items = await this.page.evaluate(() => {
          const elements = document.querySelectorAll(
            'article[aria-labelledby]',
          );
          return Array.from(elements).map(element => element.outerHTML);
        });

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
          if (this.round !== (await namespaceWrapper.getRound())) {
            console.log('round changed, closed old browser');
            this.browser.close();
            break;
          }
          // Scroll the page for next batch of elements
          await this.scrollPage(this.page);

          // Optional: wait for a moment to allow new elements to load
          await this.page.waitForTimeout(5000);

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

  // TODO : Is this even used?
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
}

module.exports = TwitterAdaptor;