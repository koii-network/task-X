const { namespaceWrapper } = require('../namespaceWrapper');

class Data {
  constructor(name, data) {
    this.name = name;
    this.data = data;
    this.dbprefix = `${name} + ":"`;
    this.fullList = [];
    this.lastUpdate = Date.now();
  }
  async intializeData() {
    if (this.db) return;
    const db = await namespaceWrapper.getDb();
    this.db = db;
  }

  // create a new item
  async create(item) {
    try {
      let itemId = this.createId(item.id);
      // console.log({ itemId, item });
      await this.db.insert(item);
    } catch (e) {
      console.error(e.key, e.errorType);
      return undefined;
    }
  }

  // creates new database with received data
  async createItems(data) {
    for (let i = 0; i < data.length; i++) {
      try {
        const createdItem = await this.create(data[i]);
        this.fullList.push(createdItem);
        console.log(
          `Created ${this.fullList.length} items from a list of ${data.length}`,
        );
      } catch (err) {
        console.error('Error creating item:', err);
      }
    }
  }
  // returns item by id
  async getItem(item) {
    let itemId = this.createId(item);
    console.log('trying to retrieve with ID', itemId);
    try {
      const resp = await this.db.findOne({ itemId });
      if (resp) {
        return resp.item;
      } else {
        return null;
      }
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  // return items by name
  async getList(options) {
    // doesn't support options or rounds yet?
    let itemListRaw;
    if (!options) {
      itemListRaw = await this.db.find({ item: { $exists: true } });
      
    } else {
      if ( options.round ) {
        console.log('has round', options.round)
        // itemListRaw = await this.db.find({ item: { $exists: true } });
        itemListRaw = await this.db.find({ round: { $exists: true }});
      
      }
    }
    // let itemList = itemListRaw.map(itemList => itemList.item);
    return itemListRaw;
  }

  // create pending item
  async addPendingItem(id, value) {
    let pendingId = this.createPendingId(id.replace(/[\[\]"]/g, ''));
    let pendingItem = 'pending:' + value.replace(/[\[\]"]/g, '');
    try {
      // console.log({ pendingId, pendingItem });
      await this.db.insert({ pendingId, pendingItem });
      // console.log('added pending item', id);
      return true;
    } catch (err) {
      // console.error('Error in addPendingItem', err.errorType);
      return undefined;
    }
  }

  // get pending item
  async getPendingItem(id) {
    let pendingId = this.createPendingId(id);
    try {
      const resp = await this.db.findOne({ pendingId });
      if (resp) {
        return resp.pendingItem;
      } else {
        return null;
      }
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  // get pending item List
  async getPendingList() {
    const pendingListRaw = await this.db.find({
      pendingItem: { $exists: true },
    });
    // console.log('pendingListRaw is ', pendingListRaw);
    let pendingList = pendingListRaw.map(pendingList =>
      pendingList.pendingItem.replace('pending:', ''),
    );
    return pendingList;
  }

  // add running item
  async addRunningItem(id, value) {
    let runningId = this.createRunningId(id);
    let runningItem = 'running:' + JSON.stringify(value);
    try {
      this.db.insert({ runningId, runningItem });
      console.log('added running item', id);
      return true;
    } catch (err) {
      console.error('Error in addrunningItem', err.errorType);
      return undefined;
    }
  }

  // get running item
  async getRunningItem(id) {
    let runningId = this.createRunningId(id);
    try {
      const resp = await this.db.findOne({ runningId });
      if (resp) {
        return resp.runningItem;
      } else {
        return null;
      }
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  // get running item List
  async getRunningList() {
    const runningListRaw = await this.db.find({
      runningItem: { $exists: true },
    });
    let runningList = runningListRaw.map(runningList =>
      runningList.runningItem.replace('running:', ''),
    );
    return runningList;
  }

  // add healthy item
  async addHealthyItem(id, value) {
    let healthyId = this.createHealthyId(id);
    let healthyItem = 'healthy:' + value.replace(/[\[\]"]/g, '');
    try {
      await this.db.insert({ healthyId, healthyItem });
      console.log('added healthy item', { healthyId, healthyItem });
      return true;
    } catch (err) {
      console.error('Error in addHealthyItem', { healthyId, healthyItem }, err);
      return undefined;
    }
  }

  // get healthy item
  async getHealthyItem(id) {
    let healthyId = this.createHealthyId(id);
    try {
      const resp = await this.db.findOne({ healthyId });
      if (resp) {
        return resp.healthyItem;
      } else {
        return null;
      }
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  // get healthy item List
  async getHealthyList() {
    const healthyListRaw = await this.db.find({
      healthyItem: { $exists: true },
    });
    // console.log('healthyListRaw is ', healthyListRaw);
    if (!healthyListRaw) return null;
    let healthyList = healthyListRaw.map(healthyList =>
      healthyList.healthyItem.replace('healthy:', ''),
    );
    return healthyList;
  }

  // add IPFS to db
  async setIPFS(id, cid) {
    let ipfsId = id;
    try {
      this.db.insert({ ipfsId, cid });
      // console.log('added IPFS', id);
      return true;
    } catch (err) {
      console.error('Error in setIPFS', err.errorType);
      return undefined;
    }
  }

  // get IPFS from db
  async getIPFS(id) {
    let healthyId = id;
    try {
      const resp = await this.db.findOne({ healthyId });
      if (resp) {
        return resp.cid;
      } else {
        return null;
      }
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  // add proof to db by round
  async addProof(round, proofItem) {
    let proof = `${this.name}:proof:${round}`;
    try {
      this.db.insert({ proof, proofItem });
      console.log('added proof', round);
      return true;
    } catch (err) {
      console.error('Error in addProof', err.errorType);
      return undefined;
    }
  }

  // get proof by round
  async getProof(round) {
    let proof = `${this.name}:proof:${round}`;
    try {
      const resp = await this.db.findOne({ proof });
      if (resp) {
        return resp.proofItem;
      } else {
        return null;
      }
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  // get list of proofs
  async getProofList() {
    const proofListRaw = await this.db.find({ proofItem: { $exists: true } });
    let proofList = proofListRaw.map(proofList =>
      proofList.proofItem.replace('proof:', ''),
    );
    return proofList;
  }

  async deleteItem(docToDelete) {
    console.log('deleting item', docToDelete);
    await this.db.remove({ docToDelete });
  }

  // Tool to create a new ID
  createId(id) {
    let newId = `${this.name}:${id}`;
    // console.log('new id is ', newId);
    return newId;
  }

  // Tool to create a pending ID
  createPendingId(id) {
    // console.log(id);
    let normalId = this.createId(id);
    // console.log('normal ID is ' + normalId);
    let pendingId = `pending:${normalId}`;
    // console.log('new pending ID: ', pendingId);
    return pendingId;
  }

  // Tool to create a runnig ID
  createRunningId(id) {
    // console.log(id);
    let normalId = this.createId(id);
    // console.log('normal ID is ' + normalId);
    let runningId = `running:${normalId}`;
    // console.log('new running ID: ', runningId);
    return runningId;
  }

  //Tool to create a healthy ID
  createHealthyId(id) {
    // console.log(id);
    let normalId = this.createId(id);
    // console.log('normal ID is ' + normalId);
    let healthyId = `healthy:${normalId}`;
    console.log('new healthy ID: ', healthyId);
    return healthyId;
  }
}

module.exports = Data;
