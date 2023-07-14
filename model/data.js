const { namespaceWrapper } = require('../namespaceWrapper');

/**
 * Data class
 * 
 * @param {string} name - the name of the database
 * @param {object} data - the initial data to be stored in the database
 * 
 * @returns {Data} - a Data object
 * 
 */

class Data {
  constructor(name, data) {
    this.name = name;
    this.data = data;
    this.dbprefix = `${name} + ":"`;
    this.fullList = [];
    this.lastUpdate = Date.now();
  }

  /**
   * initializeData
   * @returns {void}
   */
  async initializeData() {
    if (this.db) return;
    const db = await namespaceWrapper.getDb();
    this.db = db;
  }

  /**
   * create
   * @param {*} item 
   * @returns {void}
   */
  async create(item) {
    try {
      await this.db.insert(item);
    } catch (e) {
      console.error(e.key, e.errorType);
      return undefined;
    }
  }
  
  /**
   * getItem
   * @param {*} item 
   * @returns 
   * @description gets an item from the database by ID (CID)
   */
  async getItem(item) {
    console.log('trying to retrieve with ID', item);
    try {
      const resp = await this.db.findOne({ item });
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

  /**
   * getList
   * @param {*} options 
   * @returns 
   * @description gets a list of items from the database by ID (CID) 
   * or by round
   */
  async getList(options) {
    // doesn't support options or rounds yet?
    let itemListRaw;
    if (!options) {
      itemListRaw = await this.db.find({ item: { $exists: true } });
      
    } else {
      if ( options.round ) {
        console.log('has round', options.round)
        // itemListRaw = await this.db.find({ item: { $exists: true } });
        itemListRaw = await this.db.find({ round: options.round });
      
      }
    }
    // let itemList = itemListRaw.map(itemList => itemList.item);
    return itemListRaw;
  }

}

module.exports = Data;
