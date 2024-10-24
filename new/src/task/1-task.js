import { namespaceWrapper } from "@_koii/namespace-wrapper";
import { initializeTwitterTask } from "./twitter.js";

export async function task(roundNumber) {
  try {
    console.log("starting a new searcher at round", roundNumber);
    await initializeTwitterTask(roundNumber);
  } catch (e) {
    console.log("error starting searcher", e);
  }
}
