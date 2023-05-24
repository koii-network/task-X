const dotenv = require('dotenv');
require('dotenv').config();
const TwitterTask = require('../twitter-task');
const { TweetUserMentionTimelineV2Paginator } = require('twitter-api-v2');

// warning, this doesn't really work that well, but it's a start

const run = async () => {
    let delay = 45000;
    var twitterTask = null;
    let x = 1;

    twitterTask = await new TwitterTask (async() => {
        return x;
    });
    console.log('started a new crawler at round', x);
        

    setTimeout(async ()  =>   {
        console.log('stopping crawler at round', x)
        twitterTask.stop(); // unclear whether stop works
        let proof_cid = await twitterTask.getRoundCID(x);
        console.log('got round result', proof_cid);
        let output = twitterTask.validate(proof_cid);
        console.log('validated round result', output);
    }, delay)

    
}


run ()
