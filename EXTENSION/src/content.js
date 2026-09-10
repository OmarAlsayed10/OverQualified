let observer = null;
let lastSignature = "";

const signatureOf = (questions) => questions.map((question) => `${question.id}:${question.label}`).join("|");

const publishQuestions = () => {
  const result = globalThis.overqualifiedDetector.readQuestions();
  const signature = signatureOf(result.questions);
  if (signature === lastSignature) return;
  lastSignature = signature;
  chrome.runtime.sendMessage({ type: "QUESTIONS_CHANGED", payload: result }).catch(() => {});
};

const startObserver = () => {
  if (observer) return { watching: true };
  observer = new MutationObserver(() => publishQuestions());
  observer.observe(document.body, { childList: true, subtree: true });
  publishQuestions();
  return { watching: true };
};

const stopObserver = () => {
  observer?.disconnect();
  observer = null;
  lastSignature = "";
  return { watching: false };
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const detector = globalThis.overqualifiedDetector;
  if (message?.type === "READ_JOB") sendResponse(detector.readJob());
  else if (message?.type === "READ_QUESTIONS") sendResponse(detector.readQuestions());
  else if (message?.type === "START_OBSERVER") sendResponse(startObserver());
  else if (message?.type === "STOP_OBSERVER") sendResponse(stopObserver());
  return true;
});
