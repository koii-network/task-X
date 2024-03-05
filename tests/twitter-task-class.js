const dotenv = require('dotenv');
require('dotenv').config();
const TwitterTask = require('../twitter-task');
const { TweetUserMentionTimelineV2Paginator } = require('twitter-api-v2');

// warning, this doesn't really work that well, but it's a start

const run = async () => {
    let delay = 30000;
    var twitterTask = null;

    for (let x = 0; x < 3; x++) {

        setTimeout(async ()  =>   {
            if ( !twitterTask || !twitterTask.isRunning ) {
                twitterTask = await new TwitterTask (async() => {
                    return x;
                });
                console.log('started a new searcher at round', x);
                
            } else {
                const cid = await twitterTask.getRoundCID(x-1);
                console.log('got round result', cid);
                
            } 
        }, delay*x)
    }

    setTimeout(async ()  =>   {
        twitterTask.stop(); // unclear whether stop works
        let proof_cid = twitterTask.getRoundCID(0);
        console.log('got round result', proof_cid);
        twitterTask.validate(proof_cid);
    }, delay*10)

    
}


run ()
