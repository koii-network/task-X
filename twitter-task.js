const crypto = require('crypto');
const Twitter = require('./adapters/twitter/twitter.js'); 
const Gatherer = require('./model/gatherer');
const levelup = require('levelup');
const leveldown = require('leveldown');
const db = levelup(leveldown(__dirname + '/localKOIIDB'));
const Data = require('./model/data');
import { Web3Storage } from 'web3.storage';
import { File } from 'web3.storage';

function getAccessToken () {
    // If you're just testing, you can paste in a token
    // and uncomment the following line:
    // return 'paste-your-token-here'
  
    // In a real app, it's better to read an access token from an
    // environement variable or other configuration that's kept outside of
    // your code base. For this to work, you need to set the
    // WEB3STORAGE_TOKEN environment variable before you run your code.
    return process.env.WEB3STORAGE_TOKEN
  }
  
  function makeStorageClient () {
    return new Web3Storage({ token: getAccessToken() })
  }
  
  function makeFileFromObjectWithName(obj, name) {
    const buffer = Buffer.from(JSON.stringify(obj))
    return new File([buffer], name)
  }
  
  async function storeFiles (files) {
    const client = makeStorageClient()
    const cid = await client.put(files)
    console.log('stored files with cid:', cid)
    return cid
  }

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
      await adapter.crawl(query);
  
      const file = makeFileFromObjectWithName(adapter.parsed, "twitter.json");
      const cid = storeFiles([file]);
      
      return cid
  }

  module.exports = main;