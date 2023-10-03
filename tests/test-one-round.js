const dotenv = require('dotenv');
require('dotenv').config();
const TwitterTask = require('../twitter-task');
const { coreLogic } = require('../coreLogic');

// warning, this doesn't really work that well, but it's a start

const run = async () => {
    let delay = 120000;
    let round = 1;
    await coreLogic.task(round);

    setTimeout(async ()  =>   {
        console.log('stopping crawler at round', round)
    }, delay)

}


run ()
