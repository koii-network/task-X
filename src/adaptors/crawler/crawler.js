// Import required modules
const Adapter = require('../../model/adapter');
const { SpheronClient, ProtocolEnum } = require('@spheron/storage');
// const axios = require('axios');
const Data = require('../../model/data');
const PCR = require('puppeteer-chromium-resolver');
const { namespaceWrapper } = require('../../namespaceWrapper');
const fs = require('fs');

/**
 * Crawler
 * @class
 * @extends Adapter
 * @description
 * Extends the adaptor to include db and puppeter intialization
 */

class Crawler extends Adapter {
  constructor(credentials, maxRetry) {
    super(credentials, maxRetry);
    this.credentials = credentials;
    this.db = new Data('db', []);
    this.db.initializeData();
    this.proofs = new Data('proofs', []);
    this.proofs.initializeData();
    this.cids = new Data('cids', []);
    this.cids.initializeData();
    this.lastSessionCheck = null;
    this.sessionValid = false;
    this.browser = null;
    this.w3sKey = null;
    this.round = null;
    this.maxRetry = maxRetry;
  }

  /**
   * checkSession
   * @returns {Promise<boolean>}
   * @description
   * 1. Check if the session is still valid
   * 2. If the session is still valid, return true
   * 3. If the session is not valid, check if the last session check was more than 1 minute ago
   * 4. If the last session check was more than 1 minute ago, negotiate a new session
   */
  checkSession = async () => {
    if (this.sessionValid) {
      return true;
    } else if (Date.now() - this.lastSessionCheck > 50000) {
      await this.negotiateSession();
      return true;
    } else {
      return false;
    }
  };

  /**
   * negotiateSession
   * @returns {Promise<void>}
   * @description
   * 1. Get the path to the Chromium executable
   * 2. Launch a new browser instance
   * 3. Open a new page
   * 4. Set the viewport size
   * 5. Queue twitterLogin()
   */
  negotiateSession = async () => {
    try {
      if (this.browser) {
        await this.browser.close();
        console.log('Old browser closed');
      }
      const options = {};
      const stats = await PCR(options);
      console.log(
        '*****************************************CALLED PURCHROMIUM RESOLVER*****************************************',
      );
      this.browser = await stats.puppeteer.launch({
        // headless: false,
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
        executablePath: stats.executablePath,
      });
      console.log('Step: Open new page');
      this.page = await this.browser.newPage();
      await this.page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      );
      await this.page.setViewport({ width: 1920, height: 1080 });
      await this.login();
      this.w3sKey = await getAccessToken();
      return true;
    } catch (e) {
      console.log('Error negotiating session', e);
      return false;
    }
  };

  /**
   * login - Can be over-ride in child by making method of same name
   */
  login = async () => {
    // over-ride this if you need to login
    console.log('No login needed!');
  };

  /**
   * crawl - Can be over-ride in child by making method of same name
   */
  crawl = async query => {
    // over-ride this
    console.log('Crawl needs to be implemented! Query: ' + query);
  };

  /**
   * getSubmissionCID
   * @param {string} round - the round to get the submission cid for
   * @returns {string} - the cid of the submission
   * @description - this function should return the cid of the submission for the given round
   * if the submission has not been uploaded yet, it should upload it and return the cid
   */
  getSubmissionCID = async round => {
    if (this.proofs) {
      // we need to upload proofs for that round and then store the cid
      const data = await this.cids.getList({ round: round });
      console.log(`got cids list for round ${round}`);

      if (data && data.length === 0) {
        console.log('No cids found for round ' + round);
        return null;
      } else {
        let proof_cid;
        let path = `dataList.json`;
        let basePath = '';
        try {
          basePath = await namespaceWrapper.getBasePath();
          fs.writeFileSync(`${basePath}/${path}`, JSON.stringify(data));
        } catch (err) {
          console.log(err);
        }

        const client = await makeStorageClient(this.w3sKey);
        let spheronData = await client.upload(`${basePath}/${path}`, {
          protocol: ProtocolEnum.IPFS,
          name: 'dataList.json',
          onUploadInitiated: uploadId => {
            // console.log(`Upload with id ${uploadId} started...`);
          },
          onChunkUploaded: (uploadedSize, totalSize) => {
            // console.log(`Uploaded ${uploadedSize} of ${totalSize} Bytes.`);
          },
        });

        // console.log(`CID: ${cid}`);
        proof_cid = spheronData.cid;
        await this.proofs.create({
          id: 'proof:' + round,
          proof_round: round,
          proof_cid: proof_cid,
        });

        console.log('returning proof cid for submission', proof_cid);
        return proof_cid;
      }
    } else {
      throw new Error('No proofs database provided');
    }
  };

  convertToTimestamp = async dateString => {
    const date = new Date(dateString);
    return Math.floor(date.getTime() / 1000);
  };

  scrollPage = async page => {
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });
    await page.waitForTimeout(5000); // Adjust the timeout as necessary
  };

  /**
   * stop
   * @returns {Promise<boolean>}
   * @description Stops the crawler
   */
  stop = async () => {
    if (this.browser) {
      await this.browser.close();
      console.log('Old browser closed');
    }
    return (this.break = true);
  };
}

module.exports = Crawler;

async function makeStorageClient() {
  try {
    let token = await getAccessToken();
    return new SpheronClient({
      token: token,
    });
  } catch (e) {
    console.log('Error: Missing spheron token, trying again');
  }
}

async function storeFiles(data, token) {
  try {
    let cid;
    const client = await makeStorageClient(token);
    let path = `data.json`;
    let basePath = '';
    try {
      basePath = await namespaceWrapper.getBasePath();
      fs.writeFileSync(`${basePath}/${path}`, JSON.stringify(data));
    } catch (err) {
      console.log(err);
    }

    try {
      // console.log(`${basePath}/${path}`)
      let spheronData = await client.upload(`${basePath}/${path}`, {
        protocol: ProtocolEnum.IPFS,
        name: 'data.json',
        onUploadInitiated: uploadId => {
          // console.log(`Upload with id ${uploadId} started...`);
        },
        onChunkUploaded: (uploadedSize, totalSize) => {
          // console.log(`Uploaded ${uploadedSize} of ${totalSize} Bytes.`);
        },
      });
      cid = spheronData.cid;
    } catch (err) {
      console.log('error uploading to IPFS, trying again', err);
    }
    return cid;
  } catch (e) {
    console.log('Error storing files, missing w3s token', e);
  }
}

async function getAccessToken() {
  return process.env.Spheron_Storage;
}
