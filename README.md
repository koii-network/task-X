# Twitter Searcher

**Not for illegal use**

This tool is designed exclusively for theoretical use in public archival projects and is not intended to be used for for-profit activities.

Examples of fair use:
 - tracking your own social media presence
 - archiving or backing up sensitive content to protect against persecution

Examples of bad use:
 - stealing data (i.e. selling large scale analytics)
 - infringing on personal privacy (i.e. "stalking")

Please consult with a legal professional before engaging in any form of web-searching or data-gathering activities.

## Koii Tasks

Koii tasks are community based activities where participants run common code on their local machines. This repo provides an example of how to use headless browsers and DOM manipulation to automate user actions, using tasks, to provide new possibilities for community coordination.

In the Koii architecture, community nodes run tasks and generate 'submissions' which they submit to claim rewards. When a submission is posted to the network, other nodes verify, or 'audit' that submission, and then choose whether to approve rewards. See `twitter-task.js` for the task implementation. 

## What's in the Project?
This is an implementation of the default data-gatherer class of Koii tasks.

There are four main components, detailed in the adapter file: `adapters/twitter/twitter.js`
1. Negotiate Session
2. Fetch a list
3. search for an item
4. Store the item

The repo also contains a host of test files, most importantly `test/test-one-round.js` which details the full flow of one [gradual consensus](https://docs.koii.network/concepts/gradual-consensus/runtime-flow) round. 

Run the test with 
```
yarn install or npm install
yarn test or npm run test
```

## Using The Searcher
To modify the searcher query, or change how it uses the local database, open `twitter-task.js`.

The `query` object manages the key parts of the searcher.

```javascript
let searchTerm = "#koii";
let query = {
    limit: 100, // total number of records to return
    searchTerm: searchTerm, // the keyword to look for
    query: `https://twitter.com/search?q=${ searchTerm }&src=typed_query`, // the query string (including said keyword)
    depth: 3, // the depth of recursive layers to follow 
    recursive: true, // descend recursively?
    updateRound: () => {} // a function that returns the current round
    round: 1 // the current round
}
```

## Modifying the Task
Check `task-config.yaml` for the deployment config. 

## Deploying to Koii
Use the `create-task-cli` to build and deploy your task. 

```
yarn webpack #builds your task executable
npx @_koii/create-task-cli@latest #uploads your task executable to IPFS and starts it on Koii
```

For a longer demo and more information please see https://blog.koii.network/How-to-deploy-a-koii-task-in-less-than-5mins/
