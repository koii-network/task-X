const Twitter = require('./adapters/twitter/twitter.js'); 
const db = require('./helpers/db');
const { Web3Storage } = require('web3.storage');
const Data = require('./model/data');
const dotenv = require('dotenv');
const { default: axios } = require('axios');

dotenv.config();

class TwitterTask {
  constructor (getRound, round) {
    this.round = round;
    this.lastRoundCheck = Date.now();
    this.isRunning = false;
    this.searchTerm = 'Web3';
    // this.db = new Data("db"); // now unused
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
      this.adapter = new Twitter(credentials, this.db, 3);
      await this.adapter.negotiateSession(); 
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

    // await db.initializeData();

    this.isRunning = true;

    let query = {
      limit: 100,
      searchTerm: this.searchTerm,
      query: `https://twitter.com/search?q=${this.searchTerm}&src=typed_query`,
      depth: 3,
      updateRound: async () => {
        return this.updateRound()
      },
      recursive: true,
      round: this.round
    }
  
    this.adapter.crawl(query); // let it ride
    
  }

  async stop () {
    this.isRunning = false;
    this.adapter.stop();
  }

  async getRoundCID(roundID) {
    console.log('starting submission prep for ')
    let result = await this.adapter.getSubmissionCID(roundID);
    console.log('returning round CID', result, 'for round', roundID)
    return result;
    
  }

  async getJSONofCID (cid) {
    return await getJSONFromCID(cid)
  }

  async validate(proofCid) {
    // in order to validate, we need to take the proofCid 
    // and go get the results from web3.storage

    let data = await getJSONFromCID(proofCid); // check this
    // console.log(`validate got results for CID: ${ proofCid } for round ${ roundID }`, data, typeof(data), data[0]);

    // the data submitted should be an array of additional CIDs for individual tweets, so we'll try to parse it

    let proofThreshold = 4; // an arbitrary number of records to check

    for ( let i = 0; i < proofThreshold; i++ ) {
      let randomIndex = Math.floor(Math.random() * data.length);
      let item = data[randomIndex];
      let result = await getJSONFromCID(item.cid);

      // then, we need to compare the CID result to the actual result on twitter
      // i.e. 
      console.log('item was', item)

      // need to check if there's an active session and set one if not
      let twitterCheck;
      let sessionValid = await this.adapter.checkSession();
      if (item.id) {
        if (sessionValid ) {
          console.log('about to parse item on twitter', item.id)
          twitterCheck = await this.adapter.parseItem(item.id); // update to suit the adapter 
        } else {
          console.error('could not negotiate a twitter session to validate')
        }
        
        // TODO - revise this check to make sure it handles issues with type conversions
        console.log('ipfs', item)
        let ipfsCheck = await this.getJSONofCID(item.cid)
        console.log('ipfsCheck', ipfsCheck)
        console.log('twitterCheck', twitterCheck)
        console.log('data !== twitterCheck', ipfsCheck.content !== twitterCheck.content)
        if (ipfsCheck.content !== twitterCheck.content) {
          return false;
        } 
      } else { 
        console.log('invalid item id', item.id)
        return false;
      }
    }

    
    // if none of the random checks fail, return true
    return true

  }


} 

module.exports = TwitterTask;

const getJSONFromCID = async (cid) => {
  return new Promise ((resolve, reject) => {
    let url = `https://${cid}.ipfs.dweb.link/data.json`
    // console.log('making call to ', url)
    axios.get(url) 
      .then((response) => {
        if (response.status !== 200) {
          console.log('error', response)
          reject(response)
        } else {
          // console.log('response', response)
          resolve(response.data)
        }
      }
    )
    })
}
