const dotenv = require('dotenv');
require('dotenv').config();
const TwitterTask = require('../twitter-task');
const { coreLogic } = require('../coreLogic');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function executeTasks() {
    for (let i = 0; i < 10; i++) {
        let delay = 600000;
        let round = i;
        await coreLogic.task(round);

        await sleep(delay);

        console.log('stopping crawler at round', round);
    }
}

executeTasks();
