// Tests for the Data class
const datadb = require('../helpers/db');




const Item = require('../model/item');

const testData = [
  new Item({ id: 1, name: 'Item 1', description: 'First item' }),
  new Item({ id: 2, name: 'Item 2', description: 'Second item' }),
  new Item({ id: 3, name: 'Item 3', description: 'Third item' }),
  new Item({ id: 4, name: 'Item 4', description: 'Fourth item' }),
  new Item({ id: 5, name: 'Item 5', description: 'Fifth item' }),
];

async function test() {
  await datadb.initializeData();

  // TEST create healthy Item

  
    // let healthyId = '222.239.92.29:1988';
    // let healthyItem = '222.239.92.29:1988'
    // await datadb.addHealthyItem(healthyId, healthyItem)
  


  // Test creating an item
  // datadb
  //   .createItems(testData)
  //   .then(() => {
  //     console.log('Create item test passed');
  //   })
  //   .catch(err => {
  //     console.error('Create item test failed:', err);
  //   });

  // TEST get one item
  // datadb
  //   .getItem('3')
  //   .then(item => {
  //     console.log('Get item test passed', item);
  //   })

    // Test getting a list of items
  // let testlist = await datadb.getList();
  // console.log('test list is ', testlist);

  // Test pending item functionality
  // datadb.addPendingItem(5, new Item({ id: 5, name: 'Item 5', description: 'Fifth item' }))
    

  // TEST get healthy list
  // let healthyList = await datadb.getHealthyList()
  // console.log('healthy list is ', healthyList);

  // console.log('test list is ', testlist);
  //     console.log('Create item test passed');
  //   })
  //   .catch((err) => {
  //     console.error('Create item test failed:', err);
  //   });

  // // Test retrieving an item
  // data.get(2)
  // .then((item) => {
  //     console.log("return result is ", item)
  // })



  // Test getting pending List
  // let pendinglist = await datadb.getPendingList()
  // console.log('pending list is ', pendinglist);
    

  // TEST delete itme
  // data.deleteItem("pending:test:5")
  //   .then((list) => {
  //     console.log('Get pending items test passed');
  //   })
  //   .catch((err) => {
  //     console.error('Get pending items test failed:', err);
  //   });

  // Test getting pending item
//  let result = await datadb.getPendingItem(5)
// console.log('result is ', result)

  // TEST set IPFS
  // if (testlist) {
  //   console.log('test list', testlist);
  //   // const cid = db.uploadIPFS(testlist);
  //   let cid = 'befytestcid';

  //   testlist.forEach(async peer => {
  //     console.log('peer ', peer);
  //     const peerString = peer.key.toString();
  //     console.log('peer string ', peerString);
  //     await data.setIPFS(`${peerString}`, cid);
  //   });
  // } else {
  //   console.log('no test list found');
  // }

  // // Clean up the test database
  // db.close(() => {
  //   console.log('Database closed');
  // });
}

test();
