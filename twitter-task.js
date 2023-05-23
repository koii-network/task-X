const crypto = require('crypto');
const Twitter = require('./adapters/twitter/twitter.js'); 
const Gatherer = require('./model/gatherer');
const levelup = require('levelup');
const leveldown = require('leveldown');
const db = levelup(leveldown(__dirname + '/localKOIIDB'));
const Data = require('./model/data');

  const main = async() => {
    let query = {
        limit: 100,
        searchTerm: 'Web3',
        query: `https://twitter.com/search?q=${searchTerm}&src=typed_query`,
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
      let cids = await adapter.crawl(query);
     
      return cids;
  }

  module.exports = main;