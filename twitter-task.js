const Twitter = require('./adapters/twitter/twitter.js'); 
const db = require('./helpers/db');
const { Web3Storage } = require('web3.storage');
const dotenv = require('dotenv');

dotenv.config();

class TwitterTask {
  constructor (getRound) {
    this.round = getRound();
    this.lastRoundCheck = Date.now();
    this.isRunning = false;
    this.searchTerm = 'Web3';
    this.db = db;
    this.setAdapter = async ( ) => {
      const username = process.env.TWITTER_USERNAME;
      const password = process.env.TWITTER_PASSWORD;

      if (!username || !password) {
        throw new Error('Environment variables TWITTER_USERNAME and/or TWITTER_PASSWORD are not set');
      }
  
      let credentials = {
          username: username,
          password: password
      }
      this.adapter = new Twitter(credentials, db, 3, this.proofs, this.cids);
    }
    
    this.updateRound = async () => {
      // if it has been more than 1 minute since the last round check, check the round and update this.round
      if (Date.now() - this.lastRoundCheck > 60000) {
        this.round = await getRound();
        this.lastRoundCheck = Date.now();
      }
      return this.round;
    }
    this.start();
  }

  // the start method accepts a 
  async start () {
    await this.setAdapter();

    await db.intializeData();

    this.isRunning = true;

    let query = {
      limit: 100,
      searchTerm: this.searchTerm,
      query: `https://twitter.com/search?q=${this.searchTerm}&src=typed_query`,
      depth: 3,
      updateRound: async () => {
        return this.updateRound()
      },
      round: this.round
    }
  
    let options = { // TODO - unused?
        maxRetry : 3, 
        query : query
    }
    
    await this.adapter.negotiateSession(); 
    this.adapter.crawl(query); // let it ride
    
  }

  async stop () {
    this.isRunning = false;
    this.adapter.stop();
  }

  async getRoundCID(roundID) {
    
    return await this.adapter.getSubmissionCID(roundID)
    
  }

  async validate(proofCid) {
    // in order to validate, u need to take the proofCid 
    // and go get the results from web3.storage
    
    // access web3.storage
    // get the result
    

    // get the node's ip adress 
    // generate a random # 
    // recursively check
    
  }

} 

module.exports = TwitterTask;