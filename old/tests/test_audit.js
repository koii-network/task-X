const TwitterTask = require('../twitter-task');
const dotenv = require('dotenv');
dotenv.config();

(async () => {
    try {
        const getRound = () => 30;
        const round = getRound();
        const twitterTask = new TwitterTask(getRound, round);
        const proofCid = "bafybeibwtyjl2ts4m3f3kwcbcfhf6hn2q52dys37bfu7yt6vzzwjvclq7i";
        const isValid = await twitterTask.validate(proofCid, round);
        console.log("Validation result:", isValid);
    } catch (error) {
        console.error("Error during execution:", error);
    } finally {
        console.log("done");
    }
})();
