const dotenv = require('dotenv');
require('dotenv').config();
const Twitter = require('../adapters/twitter/twitter.js'); 

// warning, this doesn't really work that well, but it's a start

const run = async () => {
    
    // create a new Twitter adapter object
    const username = process.env.TWITTER_USERNAME;
    const password = process.env.TWITTER_PASSWORD;
    const searchTerm = "adot_web3"

    if (!username || !password) {
      throw new Error('Environment variables TWITTER_USERNAME and/or TWITTER_PASSWORD are not set');
    }

    let credentials = {
        username: username,
        password: password
    }
    let adapter = new Twitter(credentials, this.db, 3);
    await adapter.negotiateSession(); 

    // create an item w/ the correct url of the tweet

    let query = {
        limit: 100,
        searchTerm: searchTerm,
        query: `https://twitter.com/search?q=${searchTerm}&src=typed_query`,
        depth: 3,
        updateRound: function(){
            console.log('updateRoundCalled')
        },
        recursive: true,
        round: 1
      }
    
    let item = "https://twitter.com/minmax_ai/status/1656324271428468737"

    // call adapter.parseItem(item)
    let parsedItem = await adapter.parseItem(item, query);

    console.log(parsedItem);
}


run ()
