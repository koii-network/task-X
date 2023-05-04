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
   
    const username = process.env.TWITTER_USERNAME;
    const password = process.env.TWITTER_PASSWORD;

    let credentials = {
        username: username,
        password: password
    }
    console.log(credentials);
    
    let twitter = new Twitter(credentials, db, 3);

    twitter.negotiateSession();
}

run ()