const dotenv = require('dotenv');
require('dotenv').config();
const TwitterTask = require('../twitter-task');

// warning, this doesn't really work that well, but it's a start

const run = async () => {
    var round = 0;
    const getRound = () => {
        return round;
    }
    let delay = 30000;
    var twitterTask = null;
    
    for (let x = 0; x < 3; x++) {
        round = x;
        setTimeout(async ()  =>   {
            if ( !twitterTask || !twitterTask.isRunning ) {
                twitterTask = await new TwitterTask (getRound);
                console.log('started a new crawler at round', round);
                return null;
            } else {
                const cid = await twitterTask.getRoundCID(getRound());
                console.log('got round result', cid);
                return cid;
            } 
        }, delay*x)
    }
}


run ()
