const Twitter = require('./adapters/twitter/twitter.js');
const Data = require('./model/data');
const dotenv = require('dotenv');
const { default: axios } = require('axios');
const {KoiiStorageClient} = require('@_koii/storage-task-sdk');
const { namespaceWrapper } = require('./namespaceWrapper.js');
const { CID } = require('multiformats/cid');

async function isValidCID(cid) {
  try {
    CID.parse(cid);
    return true;
  } catch (error) {
    return false;
  }
}
dotenv.config();

/**
 * TwitterTask is a class that handles the Twitter searcher and validator
 *
 * @description TwitterTask is a class that handles the Twitter searcher and validator
 *              In this task, the searcher asynchronously populates a database, which is later
 *              read by the validator. The validator then uses the database to prepare a submission CID
 *              for the current round, and submits that for rewards.
 *
 *              Four main functions control this process:
 *              @search searchs Twitter and populates the database
 *              @validate verifies the submissions of other nodes
 *              @getRoundCID returns the submission for a given round
 *              @stop stops the searcher
 *
 * @param {function} getRound - a function that returns the current round
 * @param {number} round - the current round
 * @param {string} searchTerm - the search term to use for the searcher
 * @param {string} adapter - the adapter to use for the searcher
 * @param {string} db - the database to use for the searcher
 *
 * @returns {TwitterTask} - a TwitterTask object
 *
 */

class TwitterTask {
  constructor(getRound, round) {
    this.round = round;
    this.lastRoundCheck = Date.now();
    this.isRunning = false;
    this.searchTerm = [];
    this.adapter = null;
    this.db = new Data('db', []);
    this.db.initializeData();
    this.initialize();

    this.setAdapter = async () => {
      const username = process.env.TWITTER_USERNAME;
      const password = process.env.TWITTER_PASSWORD;
      const phone = process.env.TWITTER_VERIFICATION;

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
      this.adapter = new Twitter(credentials, this.db, 3);
      await this.adapter.negotiateSession();
    };

    this.start();
  }

  async initialize() {
    console.log('initializing twitter task');
    this.searchTerm = await this.fetchSearchTerms();
    //Store this round searchTerm
    console.log('creating search term', this.searchTerm, this.round);
    this.db.createSearchTerm(this.searchTerm, this.round);
  }

  /**
   * fetchSearchTerms
   * @description return the search terms to use for the searcher
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
      const wordsList = require('./top1000words.json');
      const randomIndex = Math.floor(Math.random() * wordsList.length);
      keyword = wordsList[randomIndex]; // Load local JSON data
    }

    return encodeURIComponent(keyword);
  }

  /**
   * strat
   * @description starts the searcher
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
      query: `https://x.com/search?q=${this.searchTerm}&src=typed_query&f=live`,
      // https://x.com/any/status/<tweets_id>
      depth: 3,
      round: this.round,
      recursive: true,
      round: this.round,
    };

    this.adapter.search(query); // let it ride
  }

  /**
   * stop
   * @description stops the searcher
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
    return await getJSONFromCID(cid, 'dataList.json');
  }

  /**
   * validate
   * @description validates a round of results from another node against the Twitter API
   * @param {*} proofCid
   * @returns
   */
  async validate(proofCid, round) {
    // in order to validate, we need to take the proofCid
    // and go get the results from IPFS
    try {
      let data = await getJSONFromCID(proofCid, 'dataList.json'); // check this
      // console.log(`validate got results for CID: ${ proofCid } for round ${ roundID }`, data, typeof(data), data[0]);
      // Check for duplicate item IDs
      let idSet = new Set();
      let duplicatedIDNumber = 0;
      for (let item of data) {
        if (idSet.has(item.id)) {
          console.log('Duplicate Item ID found: ', item.id);
          duplicatedIDNumber += 1;
        }
        idSet.add(item.id);
      }
      if (duplicatedIDNumber > 10){
        console.log(`Detected Potential Risk ; Duplicated ID is ${duplicatedIDNumber}`);
      }else{
        console.log(`Duplicated ID Check Passed ; Duplicated ID numebr is ${duplicatedIDNumber}`);
      }


      let proofThreshold = 8; // an arbitrary number of records to check
      let passedNumber = 0;
      if (data && data !== null && data.length > 0) {
      for (let i = 0; i < proofThreshold; i++) {
        console.log(`Checking the ${i} th tweet.`)
        let randomIndex = Math.floor(Math.random() * data.length);
        let item = data[randomIndex];

        // then, we need to compare the CID result to the actual result on twitter
        // i.e.
        // console.log('item was', item);
        if (item.id) {
          // }
          await new Promise(resolve => setTimeout(resolve, 30000)); 
          const result = await this.adapter.verify(item.data.tweets_id, item.data, round);
          console.log('Result from verify', result);
          if(result){passedNumber += 1;}
        } else {
          console.log('Invalid Item ID: ', item.id);
          continue;
        }
      }
      if (passedNumber >= 5){
        console.log(passedNumber,"is passedNumber")
        return true;
      }else{
        console.log(passedNumber,"is passedNumber")
        return false;
      }
    } else {
      console.log('no data from proof CID');
    }
      // if none of the random checks fail, return true
      return true;
    } catch (e) {
      console.log('error in validate', e);
      return true;
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

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getJSONFromCID = async (
  cid,
  fileName,
  retries = 3
) => {
  const validateCID = await isValidCID(cid)
  if (!validateCID) {
    console.log(`Invalid CID: ${cid}`);
    return null;
  }

  const client = new KoiiStorageClient(undefined, undefined, false);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const blob = await client.getFile(cid, fileName);
      const text = await blob.text(); // Convert Blob to text
      const data = JSON.parse(text); // Parse text to JSON
      return data;
    } catch (error) {
      console.log(`Attempt ${attempt}: Error fetching file from Koii IPFS: ${error.message}`);
      if (attempt === retries) {
        throw new Error(`Failed to fetch file after ${retries} attempts`);
      }
      // Optionally, you can add a delay between retries
      await new Promise(resolve => setTimeout(resolve, 3000)); // 3-second delay
    }
  }

  return null; 
};
