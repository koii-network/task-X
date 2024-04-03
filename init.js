const express = require('express');
// Only used for testing purposes, in production the env will be injected by tasknode
require('dotenv').config();
const bodyParser = require('body-parser');
/**
 * This will be the name of the current task as coming from the task node running this task.
 */
const TASK_NAME = process.argv[2] || 'Local';
/**
 * This will be the id of the current task as coming from the task node running this task.
 */
const TASK_ID = process.argv[3];
/**
 * This will be the PORT on which the this task is expected to run the express server coming from the task node running this task.
 * As all communication via the task node and this task will be done on this port.
 */
const EXPRESS_PORT = process.argv[4] || 10000;

const LogLevel = {
  Log: 'log',
  Warn: 'warn',
  Error: 'error',
};

// Not used anymore
// const NODE_MODE = process.argv[5];

/**
 * This will be the main account public key in string format of the task node running this task.
 */
const MAIN_ACCOUNT_PUBKEY = process.argv[6];
/**
 * This will be the secret used by the task to authenticate with task node running this task.
 */
const SECRET_KEY = process.argv[7];
/**
 * This will be K2 url being used by the task node, possible values are 'https://k2-testnet.koii.live' | 'https://k2-devnet.koii.live' | 'http://localhost:8899'
 */
const K2_NODE_URL = process.argv[8] || 'https://k2-testnet.koii.live';
/**
 * This will be public task node endpoint (Or local if it doesn't have any) of the task node running this task.
 */
const SERVICE_URL = process.argv[9];
/**
 * This will be stake of the task node running this task, can be double checked with the task state and staking public key.
 */
const STAKE = Number(process.argv[10]);
/**
 * This will be the port used by task node as the express server port, so it can be used by the task for the communication with the task node
 */
const TASK_NODE_PORT = Number(process.argv[11]);

const app = express();

console.log('SETTING UP EXPRESS');

app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE',
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', false);
  if (req.method === 'OPTIONS')
    // if is preflight(OPTIONS) then response status 204(NO CONTENT)
    return res.send(204);
  next();
});

app.get('/', (req, res) => {
  res.send('Hello World!');
});

const _server = app.listen(EXPRESS_PORT, () => {
  console.log(`${TASK_NAME} listening on port ${EXPRESS_PORT}`);
});

module.exports = {
  app,
  TASK_ID,
  MAIN_ACCOUNT_PUBKEY,
  SECRET_KEY,
  K2_NODE_URL,
  SERVICE_URL,
  STAKE,
  TASK_NODE_PORT,
  LogLevel,
  _server
};
