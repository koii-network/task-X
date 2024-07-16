const TwitterTask = require('../twitter-task'); // 替换为TwitterTask类所在文件的正确路径
const dotenv = require('dotenv');
dotenv.config();

(async () => {
    await TwitterTask.validate("bafybeihgko6g5gbtnqcm2qms4iuy2irkdyiqrxnolcqqjnbp32zbcgxxei")
})();
