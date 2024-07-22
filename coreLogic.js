const { namespaceWrapper } = require('./namespaceWrapper');
const TwitterTask = require('./twitter-task');
const { LAMPORTS_PER_SOL } = require('@_koi/web3.js');

class CoreLogic {
  constructor() {
    this.twitterTask = null;
  }

  async task(roundNumber) {
    console.log('Main task called with round', roundNumber);
    try {
      this.twitterTask = await new TwitterTask(roundNumber, roundNumber);
      console.log('started a new searcher at round', roundNumber);
    } catch (e) {
      console.log('error starting searcher', e);
    }
  }

  /**
   * @fetchSubmission
   * @description This function is called by the Koi core to fetch the submission values
   *              before the node makes it's submission to claim rewards at the end of each round
   * @param {string} round
   * @returns {string} cid
   */
  async fetchSubmission(roundNumber) {
    console.log('fetchSubmission called');
    try {
      const cid = await this.twitterTask.getRoundCID(roundNumber);
      if (cid && cid !== 'default') {
        console.log('about to make submission with CID: ', cid);
        return cid;
      } else {
        console.log('No submission call made as return cid is null');
      }
    } catch (error) {
      console.error('No submission call made as return cid is null', error);
      throw error;
    }
  }

  /**
   * generateDistributionList
   * @param {*} round
   * @param {*} _dummyTaskState
   * @description This function is called by the Koi core to generate the distribution list
   *             before the node makes it's submission to claim rewards at the end of each round
   *            The distribution list is a JSON object with the following structure:
   *           {
   *            "address1": 0.1,
   *           "address2": 0.2,
   *          "address3": 0.3,
   *         "address4": 0.4
   *        } where each address is the address of a validator node and the value is the percentage of the reward that the node will receive
   * @returns
   */
  async generateDistributionList(round, _dummyTaskState) {
    try {
      console.log('GenerateDistributionList called');
      // console.log('I am selected node');

      // Write the logic to generate the distribution list here by introducing the rules of your choice

      /*  **** SAMPLE LOGIC FOR GENERATING DISTRIBUTION LIST ******/

      let distributionList = {};
      let distributionCandidates = [];
      let taskAccountDataJSON = null;
      let taskStakeListJSON = null;
      try {
        taskAccountDataJSON = await namespaceWrapper.getTaskSubmissionInfo(
          round,
          true
        );
      } catch (error) {
        console.error('ERROR IN FETCHING TASK SUBMISSION DATA', error);
        return distributionList;
      }
      if (taskAccountDataJSON == null) {
        console.error('ERROR IN FETCHING TASK SUBMISSION DATA');
        return distributionList;
      }
      const submissions = taskAccountDataJSON.submissions[round];
      const submissions_audit_trigger =
        taskAccountDataJSON.submissions_audit_trigger[round];
      if (submissions == null) {
        console.log(`No submisssions found in round ${round}`);
        return distributionList;
      } else {
        const keys = Object.keys(submissions);
        const values = Object.values(submissions);
        const size = values.length;
        // console.log('Submissions from last round: ', keys, values, size);
        taskStakeListJSON = await namespaceWrapper.getTaskState({
          is_stake_list_required: true,
        });
        if (taskStakeListJSON == null) {
          console.error('ERROR IN FETCHING TASK STAKING LIST');
          return distributionList;
        }
        // Logic for slashing the stake of the candidate who has been audited and found to be false
        for (let i = 0; i < size; i++) {
          const candidatePublicKey = keys[i];
          if (
            submissions_audit_trigger &&
            submissions_audit_trigger[candidatePublicKey]
          ) {
            // console.log(
            //   'distributions_audit_trigger votes ',
            //   submissions_audit_trigger[candidatePublicKey].votes,
            // );
            const votes = submissions_audit_trigger[candidatePublicKey].votes;
            if (votes.length === 0) {
              // slash 70% of the stake as still the audit is triggered but no votes are casted
              // Note that the votes are on the basis of the submission value
              // to do so we need to fetch the stakes of the candidate from the task state
              const stake_list = taskStakeListJSON.stake_list;
              const candidateStake = stake_list[candidatePublicKey];
              const slashedStake = candidateStake * 0;
              distributionList[candidatePublicKey] = 0;
              // console.log('Candidate Stake', candidateStake);
            } else {
              let numOfVotes = 0;
              for (let index = 0; index < votes.length; index++) {
                if (votes[index].is_valid) numOfVotes++;
                else numOfVotes--;
              }

              if (numOfVotes < 0 && taskStakeListJSON) {
                // slash 70% of the stake as the number of false votes are more than the number of true votes
                // Note that the votes are on the basis of the submission value
                // to do so we need to fetch the stakes of the candidate from the task state
                const stake_list = taskStakeListJSON.stake_list;
                const candidateStake = stake_list[candidatePublicKey];
                const slashedStake = candidateStake * 0;
                distributionList[candidatePublicKey] = 0;
                // console.log('Candidate Stake', candidateStake);
              }

              if (numOfVotes > 0) {
                distributionCandidates.push(candidatePublicKey);
              }
            }
          } else {
            distributionCandidates.push(candidatePublicKey);
          }
        }
      }

      // now distribute the rewards based on the valid submissions
      // Here it is assumed that all the nodes doing valid submission gets the same reward

      const reward = Math.floor(
        taskStakeListJSON.bounty_amount_per_round /
          distributionCandidates.length,
      );
      // console.log('REWARD RECEIVED BY EACH NODE', reward);
      for (let i = 0; i < distributionCandidates.length; i++) {
        distributionList[distributionCandidates[i]] = reward;
      }
      // console.log('Distribution List', distributionList);
      return distributionList;
    } catch (err) {
      console.log('ERROR IN GENERATING DISTRIBUTION LIST', err);
    }
  }

  /**
   * submitDistributionList
   * @description This function is called by the Koi core to submit the distribution list
   *             after the node makes it's submission to claim rewards at the end of each round
   * @param {*} distributionList // must be populated by generateDistributionList
   * @param {*} round
   * @returns
   * @memberof Node
   */
  submitDistributionList = async round => {
    // This function just upload your generated dustribution List and do the transaction for that

    console.log('SubmitDistributionList called');

    try {
      const distributionList = await this.generateDistributionList(round);
      if (Object.keys(distributionList).length === 0) {
        console.log('NO DISTRIBUTION LIST GENERATED');
        return;
      }
      const decider = await namespaceWrapper.uploadDistributionList(
        distributionList,
        round,
      );
      // console.log('DECIDER', decider);

      if (decider) {
        const response =
          await namespaceWrapper.distributionListSubmissionOnChain(round);
        console.log('RESPONSE FROM DISTRIBUTION LIST', response);
      }
    } catch (err) {
      console.log('ERROR IN SUBMIT DISTRIBUTION', err);
    }
  }

  async selectAndGenerateDistributionList(
    round,
    isPreviousRoundFailed = false,
  ) {
    await namespaceWrapper.selectAndGenerateDistributionList(
      this.submitDistributionList,
      round,
      isPreviousRoundFailed,
    );
  }

  /**
   * validateNode
   * @description This function is called auditSubmission() to validate the submission value
   *           submitted by the node at the end of each round, and uses the more extensive
   *         validation logic in twitter-task.js to determine if the node is eligible for rewards
   * @param {*} submission_value
   * @param {*} submission_value
   * @param {*} round
   * @returns
   */
  validateNode = async (submission_value, round) => {
    let vote;
    if (this.twitterTask !== null) {
    vote = await this.twitterTask.validate(submission_value, round);
    } else {
      vote = true;
    }
    return vote; 
  };

  /**
   * shallowEqual
   * @description This function is called by the Koi core to compare the submission values
   *
   * @param {*} object1
   * @param {*} object2
   * @returns
   */
  async shallowEqual(object1, object2) {
    const keys1 = Object.keys(object1);
    const keys2 = Object.keys(object2);
    if (keys1.length !== keys2.length) {
      return false;
    }
    for (let key of keys1) {
      if (object1[key] !== object2[key]) {
        return false;
      }
    }
    return true;
  }

  /**
   * validateDistribution
   * @description This function is called by the Koi core to validate the distribution list
   *              and piggybacks off of generateDistributionList
   * @param {*} distributionListSubmitter
   * @param {*} round
   * @param {*} _dummyDistributionList
   * @param {*} _dummyTaskState
   * @returns
   * @memberof Node
   */
  validateDistribution = async (
    distributionListSubmitter,
    round,
    _dummyDistributionList,
    _dummyTaskState,
  ) => {
    // Write your logic for the validation of submission value here and return a boolean value in response
    // this logic can be same as generation of distribution list function and based on the comparision will final object , decision can be made
    // return true;
    try {
      // console.log('Distribution list Submitter', distributionListSubmitter);
      const rawDistributionList = await namespaceWrapper.getDistributionList(
        distributionListSubmitter,
        round,
      );
      let fetchedDistributionList;
      if (rawDistributionList == null) {
        fetchedDistributionList = _dummyDistributionList;
      } else {
        fetchedDistributionList = JSON.parse(rawDistributionList);
      }
      // console.log('FETCHED DISTRIBUTION LIST', fetchedDistributionList);
      const generateDistributionList = await this.generateDistributionList(
        round,
        _dummyTaskState,
      );

      // compare distribution list

      const parsed = fetchedDistributionList;
      // console.log(
      //   'compare distribution list',
      //   parsed,
      //   generateDistributionList,
      // );
      const result = await this.shallowEqual(parsed, generateDistributionList);
      console.log('RESULT', result);
      return true;
    } catch (err) {
      console.log('ERROR IN VALIDATING DISTRIBUTION', err);
      return true;
    }
  };

  /**
   * submitTask
   * @description This function is called by the Koi core to submit the submission value
   *             at the end of each round
   * @param {*} roundNumber
   * @returns Promise<void>
   */
  async submitTask(roundNumber) {
    console.log('submitTask called with round', roundNumber);
    try {
      // console.log('inside try');
      console.log(
        await namespaceWrapper.getSlot(),
        'current slot while calling submit',
      );
      const submission = await this.fetchSubmission(roundNumber);
      if (submission) {
        console.log('SUBMISSION', submission);
        await namespaceWrapper.checkSubmissionAndUpdateRound(
          submission,
          roundNumber,
        );
      }else {
        console.log('no submission call made as submission is null');
      }
      console.log('after the submission call');
    } catch (error) {
      console.log('error in submission', error);
    }
  }

  /**
   * auditTask
   * @description This function is called by the Koi core to audit the submission value
   *            at the end of each round
   * @param {*} roundNumber
   * @returns Promise<void>
   * @memberof Node
   */
  async auditTask(roundNumber) {
    console.log('auditTask called with round', roundNumber);
    console.log(
      await namespaceWrapper.getSlot(),
      'current slot while calling auditTask',
    );
    await namespaceWrapper.validateAndVoteOnNodes(
      this.validateNode,
      roundNumber,
    );
  }

  /**
   * auditDistribution
   * @description This function is called by the Koi core to audit the distribution list
   *           at the end of each round
   * @param {*} roundNumber
   * @returns Promise<void>
   * @memberof Node
   */

  async auditDistribution(roundNumber, isPreviousRoundFailed=false) {
    console.log('AUDIT DISTRIBUTION CALLED WITHIN ROUND: ', roundNumber);
    await namespaceWrapper.validateAndVoteOnDistributionList(
      this.validateDistribution,
      roundNumber,
      isPreviousRoundFailed
    );
  }
}
const coreLogic = new CoreLogic();

module.exports = { coreLogic };
