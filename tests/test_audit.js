const TwitterTask = require('../twitter-task');
const dotenv = require('dotenv');
dotenv.config();

(async () => {
    try {
        const getRound = () => 0;
        const round = getRound();
        const twitterTask = new TwitterTask(getRound, round);
        const proofCid = "bafybeih6lezod6fnfyvvxfoai552gof3y4t3upgejxclrww5ot2vbzbm24";
        const isValid = await twitterTask.validate(proofCid);
        console.log("Validation result:", isValid);
    } catch (error) {
        console.error("Error during execution:", error);
    } finally {
        console.log("done");
    }
})();
