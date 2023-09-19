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
      const existingItem = await this.getItem(item);
      // console.log('get item', existingItem);

      if (existingItem.id) {
        if (
          !existingItem.timestamp ||
          (item.timestamp && item.timestamp > existingItem.timestamp)
        ) {
          // Remove the old item with the same ID
          await this.db.remove({ id: item.id }, {});
          console.log('Old item removed');
          this.db.compactDatafile();
        } else {
          console.log('New item has a lower or equal timestamp; ignoring');
          return undefined;
        }
      }

      await this.db.insert(item);
      console.log('Item inserted', item);
    } catch (e) {
      console.error(e);
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
    console.log('trying to retrieve with ID', item.id);
    try {
      const resp = await this.db.find({ id: item.id });
      // console.log('resp is ', resp);
      if (resp) {
        return resp;
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
    console.log('has round', options.round);
    // itemListRaw = await this.db.find({ item: { $exists: true } });
    itemListRaw = await this.db.find({ round: options.round });

    return itemListRaw;
  }
}

module.exports = Data;
