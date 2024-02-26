const dotenv = require('dotenv');
require('dotenv').config();
const TwitterTask = require('../twitter-task');
const { TweetUserMentionTimelineV2Paginator } = require('twitter-api-v2');

// warning, this doesn't really work that well, but it's a start


const run = async () => {

    round = 0;

    twitterTask = await new TwitterTask (async() => {
        return round;
    });
    console.log('validating at round', round);

    let cid = "bafybeicnt4zakdwcvnuwryskesj2lxn4h4ndq5y7twy3mntozaj56i2giq";
    console.log('with CID', cid)
    await twitterTask.setAdapter();
    // await twitterTask.db.initializeData();
    let output = await twitterTask.validate(cid, round);
    console.log('validated round result', output);
    twitterTask.stop();
}


run ()
