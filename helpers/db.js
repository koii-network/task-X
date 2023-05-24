const { namespaceWrapper } = require('../namespaceWrapper');
const Data = require('../model/data');

namespaceWrapper.getDb().then((db)=>{
  console.log("DB",db)
  db.ensureIndex({ fieldName: 'healthyId', unique: true, sparse:true }, function (err) {
    if (err) console.error('Index creation error:', err);
  });
  
  db.ensureIndex({ fieldName: 'pendingId', unique: true, sparse:true }, function (err) {
    if (err) console.error('Index creation error:', err);
  });
  
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

let dataDb = new Data('arweaveNodes');
module.exports = dataDb;
