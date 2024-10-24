export async function randomSleep(delayTime) {
  const delay =
    Math.floor(Math.random() * (delayTime - 2000 + 1)) + (delayTime - 2000);
  return new Promise((resolve) => setTimeout(resolve, delay));
}
