const dotenv = require('dotenv');
require('dotenv').config();
const TwitterTask = require('../twitter-task');

// warning, this doesn't really work that well, but it's a start

const run = async () => {
    let delay = 60000;
    var twitterTask = null;
    let round = 2;

    twitterTask = await new TwitterTask (async() => {
        return round;
    });
    console.log('started a new crawler at round', round);
        

    setTimeout(async ()  =>   {
        console.log('stopping crawler at round', round)
        twitterTask.stop(); // unclear whether stop works
        let proof_cid = await twitterTask.getRoundCID(round);
        console.log('got round result', proof_cid);
        let output = await twitterTask.validate(proof_cid, round);
        console.log('validated round result', output);


    }, delay)

}


run ()
