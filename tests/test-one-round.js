const dotenv = require('dotenv');
require('dotenv').config();
const TwitterTask = require('../twitter-task');
const { coreLogic } = require('../coreLogic');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function executeTasks() {
    for (let i = 3; i < 10; i++) {
        let delay = 1200000;
        let round = i;
        coreLogic.task(round);
        coreLogic.auditTask(round - 1)
        await sleep(delay);

        console.log('stopping searcher at round', round);
    }
}

executeTasks();
