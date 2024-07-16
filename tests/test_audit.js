const TwitterTask = require('../twitter-task');
const dotenv = require('dotenv');
dotenv.config();

(async () => {
    try {
        const getRound = () => 1; // 替换为获取当前轮次的实际实现
        const round = getRound();
        const twitterTask = new TwitterTask(getRound, round);

        await twitterTask.initialize();
        await twitterTask.start();

        const proofCid = "bafybeihgko6g5gbtnqcm2qms4iuy2irkdyiqrxnolcqqjnbp32zbcgxxei";
        const isValid = await twitterTask.validate(proofCid);
        console.log("Validation result:", isValid);
    } catch (error) {
        console.error("Error during execution:", error);
    } finally {
        console.log("done");
    }
})();
