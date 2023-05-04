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
   
    const username = process.env.TWITTER_USER_NAME;
    const username_id = process.env.TWITTER_USER_ID;
    const password = process.env.TWITTER_PASSWORD;

    let credentials = {
        username: username,
        username_id: username_id,
        password: password
    }
    
    let twitter = new Twitter(credentials, db, 3);

    twitter.negotiateSession();
}

run ()