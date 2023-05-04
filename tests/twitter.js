const dotenv = require('dotenv');
require('dotenv').config();

const Gatherer = require('../model/gatherer');
const levelup = require('levelup');
const Twitter = require('../adapters/twitter/twitter');
const leveldown = require('leveldown');
const db = levelup(leveldown(__dirname + '/localKOIIDB'));
const Data = require('../model/data');

const run = async () => {
    let query = {
        limit: 100,
        query: "Web3",
        depth: 3,
    }
   
    let options = {
        maxRetry : 3, 
        query : query
    }

    const username = process.env.TWITTER_USERNAME;
    const password = process.env.TWITTER_PASSWORD;

    let credentials = {
        username: username,
        password: password
    }
    
    let data = new Data('twitter', db);

    let adapter = new Twitter(credentials, data, 3);

    await adapter.negotiateSession(); 
    
    const tweetIds = await adapter.fetchList(query.query);
    console.log(tweetIds);

    const dataz = await adapter.parseItem(tweetIds[0]);
    console.log(dataz);
}

run ()