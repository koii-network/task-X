const TwitterTask = require('../twitter-task');
const dotenv = require('dotenv');
dotenv.config();

(async () => {
    try {
        const getRound = () => 1;
        const round = getRound();
        const twitterTask = new TwitterTask(getRound, round);
        const proofCid = "bafybeigybbtvrt2zdrkjumaiehwai3mj5rzvl7mmub3rmoilyddhmspcsm";
        const isValid = await twitterTask.validate(proofCid);
        console.log("Validation result:", isValid);
    } catch (error) {
        console.error("Error during execution:", error);
    } finally {
        console.log("done");
    }
})();
