// require('dotenv').config();
// const { SpheronClient, ProtocolEnum } = require('@spheron/storage');
// const LitJsSdk = require('@lit-protocol/lit-node-client');

// const spheron = new SpheronClient({ token: process.env.Spheron_Storage});

// const main = async () => {
//   const client = new LitJsSdk.LitNodeClient({});
//   await client.connect();

//   let authSig = [];

//   const decryptedData = await spheron.decryptUpload({
//     authSig,
//     ipfsCid: 'bafybeihtw55ko64nhjoudioypd3exli67ccf63p6x6itvkllu2uwswzwlu',
//     litNodeClient: client,
//   });

//   console.log('decryptedData', decryptedData);
// };

// main();
