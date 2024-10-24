const { namespaceWrapper } = require('../namespaceWrapper');
const Data = require('../model/data');

/**
 * namespaceWrapper is a class that handles the Twitter searcher and validator
 * we use it here to create a database for the Twitter searcher
 * which is then used in the TwitterTask class
 * see twitter-task.js in the root folder for more.
 */
namespaceWrapper.getDb().then((db)=>{
  console.log("DB",db)
  // TODO - finish tuning db
  // db.ensureIndex({ fieldName: 'cid', unique: true, sparse:true }, function (err) {
  //   if (err) console.error('Index creation error:', err);
  // });
  
  // db.ensureIndex({ fieldName: 'round', unique: true, sparse:true }, function (err) {
  //   if (err) console.error('Index creation error:', err);
  // });
  
  db.ensureIndex({ fieldName: 'runningId', unique: true, sparse:true }, function (err) {
    if (err) console.error('Index creation error:', err);
  });
  
  db.ensureIndex({ fieldName: 'ipfsId', unique: true, sparse:true }, function (err) {
    if (err) console.error('Index creation error:', err);
  });
  
  db.ensureIndex({ fieldName: 'proof', unique: true, sparse:true }, function (err) {
    if (err) console.error('Index creation error:', err);
  });
  
});

let dataDb = new Data('twitterscrape');
module.exports = dataDb;
