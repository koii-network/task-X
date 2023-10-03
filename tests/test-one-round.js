const dotenv = require('dotenv');
require('dotenv').config();
const TwitterTask = require('../twitter-task');
const { coreLogic } = require('../coreLogic');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function executeTasks() {
    for (let i = 0; i < 10; i++) {
        let delay = 12000;
        let round = i;
        await coreLogic.task(round);

        await sleep(delay);

        console.log('stopping crawler at round', round);

        // If you want the entire loop to run after 60 seconds, add this:
        await sleep(60000 - delay); // 60000ms is 60 seconds
    }
}

executeTasks();
