const dotenv = require('dotenv');
require('dotenv').config();
const TwitterTask = require('../twitter-task');
const { TweetUserMentionTimelineV2Paginator } = require('twitter-api-v2');

// warning, this doesn't really work that well, but it's a start

const run = async () => {
    var round = 0;
    let delay = 30000;
    var twitterTask = null;
    
    for (let x = 0; x < 3; x++) {
        const getRound = () => {
            round = x;
            return round;
        }
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

    setTimeout(async ()  =>   {
        twitterTask.stop(); // unclear whether stop works
        let proof_cid = twitterTask.getRoundCID(0);
        console.log('got round result', proof_cid);
    }, delay*20)
}


run ()
