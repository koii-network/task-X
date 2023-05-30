const { namespaceWrapper } = require('./namespaceWrapper');
const linktree_task = require('./linktree_task');
const linktree_validate = require('./linktree_validate');

/**
 * @class Linktree
 * @description
 * Linktree is a class that contains all the logic for a task. 
 * It is instantiated by the task runner, and is passed a database to store data in.
 * 
 * 
 * 1. Task -> generates submission data to local db
 * 2. Submission -> uploads submission data to IPFS and returns CID
 * 3. Validate -> validates submission data by replicating the process of creating it
 * 4. Score -> scores submissions and distributes rewards
 * */

class Twitter {
    // Tasks produce submissions and log them to a LOCAL database
    task = async() => {
        // run linktree task
        console.log('*********task() started*********');

        const proof_cid = await linktree_task();

        const round = await namespaceWrapper.getRound();

        // TEST For only testing purposes:
        // const round = 1000

        if (proof_cid) {
        await db.setNodeProofCid(round, proof_cid); // store CID in levelDB
        console.log('Node Proof CID stored in round', round)
        } else {
        console.log('CID NOT FOUND');
        }

        console.log('*********task() completed*********');
    }

    // To prove work, each node will submit it's 'submission' at the end of the round, by collecting data from it's Local Database and uploading to IPFS
    generateSubmissionCID = async () => {
        let cid = "";

        // this function must return a CID
        return cid;
    }

    // Each submission can be validated by replicating the process of creating it
    validateSubmissionCID = async (cid, round) => {

        // audit logic goes here

        // returns false if the submission is invalid, or true if the submission passes
        return true;
    }

    // Once all submissions have been audited, they can be scored to distribute rewards
    scoreSubmissions = async () => { // aka generate distributions 
        // This function indexes a list of submissions, scores each of them, and returns a final reward for each submitter pubkey
        let distributionList = [];

        return distributionList;
    }

    // NOTE: There is no need for a 'validateDistribution' function, as distributions are fully deterministic based on the data submitted on-chain
    // In some cases a distribution may require special validation, in which case coreLogic.js can be edited directly

}

module.exports = Linktree;