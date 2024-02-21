const Twitter = require('./adaptors/twitter/twitter.js');
const Data = require('./model/data');
const dotenv = require('dotenv');
const { default: axios } = require('axios');
const { namespaceWrapper } = require('./namespaceWrapper.js');
dotenv.config();

/**
 * TwitterTask is a class that handles the Twitter crawler and validator
 *
 * @description TwitterTask is a class that handles the Twitter crawler and validator
 *              In this task, the crawler asynchronously populates a database, which is later
 *              read by the validator. The validator then uses the database to prepare a submission CID
 *              for the current round, and submits that for rewards.
 *
 *              Four main functions control this process:
 *              @crawl crawls Twitter and populates the database
 *              @validate verifies the submissions of other nodes
 *              @getRoundCID returns the submission for a given round
 *              @stop stops the crawler
 *
 * @param {function} getRound - a function that returns the current round
 * @param {number} round - the current round
 * @param {string} searchTerm - the search term to use for the crawler
 * @param {string} adapter - the adapter to use for the crawler
 * @param {string} db - the database to use for the crawler
 *
 * @returns {TwitterTask} - a TwitterTask object
 *
 */

class TwitterTask {
  constructor(round) {
    this.round = round;
    this.lastRoundCheck = Date.now();
    this.isRunning = false;
    this.searchTerm = [];
    this.adapter = null;
    this.initialize();

    this.setAdapter = async () => {
      const username = process.env.TWITTER_USERNAME;
      const password = process.env.TWITTER_PASSWORD;
      const phone = process.env.TWITTER_PHONE;

      if (!username || !password) {
        throw new Error(
          'Environment variables TWITTER_USERNAME and/or TWITTER_PASSWORD are not set',
        );
      }

      let credentials = {
        username: username,
        password: password,
        phone: phone,
      };
      this.adapter = new Twitter(credentials, 3);
      await this.adapter.negotiateSession();
    };

    this.start();
  }

  async initialize() {
    console.log('initializing twitter task');
    this.searchTerm = await this.fetchSearchTerms();
    //Store this round searchTerm
    console.log('creating search term', this.searchTerm, this.round);
    this.adapter.db.createSearchTerm(this.searchTerm, this.round);
  }

  /**
   * fetchSearchTerms
   * @description return the search terms to use for the crawler
   * @returns {array} - an array of search terms
   */
  async fetchSearchTerms() {
    let keyword;

    try {
      const submitterAccountKeyPair = (
        await namespaceWrapper.getSubmitterAccount()
      ).publicKey;
      const key = submitterAccountKeyPair.toBase58();
      console.log('submitter key', key);
      const response = await axios.get('http://localhost:3000/keywords', {
        params: {
          key: key,
        },
      });
      // console.log('keywords from middle server', response.data);
      keyword = response.data;
    } catch (error) {
      console.log(
        'No Keywords from middle server, loading local keywords.json',
      );
      const wordsList = require('./testData/top1000words.json');
      const randomIndex = Math.floor(Math.random() * wordsList.length);
      keyword = wordsList[randomIndex]; // Load local JSON data
    }

    return encodeURIComponent(keyword);
  }

  /**
   * strat
   * @description starts the crawler
   *
   * @returns {void}
   *
   */
  async start() {
    await this.setAdapter();

    this.isRunning = true;

    let query = {
      limit: 100, // unused
      searchTerm: this.searchTerm,
      query: `https://twitter.com/search?q=${this.searchTerm}&src=typed_query&f=live`,
      depth: 3,
      round: this.round,
      recursive: true,
      round: this.round,
    };

    this.adapter.crawl(query); // let it ride
  }

  /**
   * stop
   * @description stops the crawler
   *
   * @returns {void}
   */
  async stop() {
    this.isRunning = false;
    this.adapter.stop();
  }

  /**
   * getRoundCID
   * @param {*} roundID
   * @returns
   */
  async getRoundCID(roundID) {
    console.log('starting submission prep for ');
    let result = await this.adapter.getSubmissionCID(roundID);
    console.log('returning round CID', result, 'for round', roundID);
    return result;
  }

  /**
   * getJSONofCID
   * @description gets the JSON of a CID
   * @param {*} cid
   * @returns
   */
  async getJSONofCID(cid) {
    return await getJSONFromCID(cid, 'data.json');
  }

  /**
   * validate
   * @description validates a round of results from another node against the Twitter API
   * @param {*} proofCid
   * @returns
   */
  async validate(proofCid) {
    // in order to validate, we need to take the proofCid
    // and go get the results from web3.storage
    try {
      let data = await getJSONFromCID(proofCid, 'dataList.json'); // check this
      // console.log(`validate got results for CID: ${ proofCid } for round ${ roundID }`, data, typeof(data), data[0]);

      // the data submitted should be an array of additional CIDs for individual tweets, so we'll try to parse it

      let proofThreshold = 4; // an arbitrary number of records to check
      for (let i = 0; i < proofThreshold; i++) {
        let randomIndex = Math.floor(Math.random() * data.length);
        let item = data[randomIndex];

        // then, we need to compare the CID result to the actual result on twitter
        // i.e.
        // console.log('item was', item);
        if (item.id) {
          try {
            // console.log('ipfs', item);
            let ipfsCheck = await this.getJSONofCID(item.cid);
            console.log('ipfsCheck', ipfsCheck);
            if (ipfsCheck.id) {
              console.log('ipfs check passed');
            }
            return true;
          } catch (e) {
            console.log('ipfs check failed', e);
            return false;
          }
        } else {
          console.log('invalid item id', item.id);
          return false;
        }
      }

      // if none of the random checks fail, return true
      return true;
    } catch (e) {
      console.log('error in validate', e);
      return false;
    }
  }
}

module.exports = TwitterTask;

/**
 * getJSONFromCID
 * @description gets the JSON from a CID
 * @param {*} cid
 * @returns promise<JSON>
 */
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

const getJSONFromCID = async (cid, fileName, maxRetries = 3, retryDelay = 3000) => {
  let url = `https://${cid}.ipfs.w3s.link/${fileName}`;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.get(url);
      if (response.status === 200) {
        return response.data;
      } else {
        console.log(`Attempt loading IPFS ${attempt}: Received status ${response.status}`);
      }
    } catch (error) {
      console.log(`Attempt loading IPFS ${attempt} failed: ${error.message}`);
      if (attempt < maxRetries) {
        console.log(`Waiting for ${retryDelay / 1000} seconds before retrying...`);
        await sleep(retryDelay);
      } else {
        return false; // Rethrow the last error
      }
    }
  }
};
