const DEFAULT_API = "http://localhost:3001";

const settings = async () => {
  const stored = await chrome.storage.local.get(["apiBase", "token"]);
  return { apiBase: stored.apiBase || DEFAULT_API, token: stored.token || null };
};

const api = async (path, options = {}) => {
  const { apiBase, token } = await settings();
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(body.message || `HTTP ${response.status}`), { status: response.status, body });
  return body;
};

const startPairing = async () => {
  const { apiBase } = await settings();
  const pairing = await api("/api/extension/pair", { method: "POST" });
  await chrome.tabs.create({ url: `${apiBase}/api/extension/approve?code=${encodeURIComponent(pairing.code)}` });
  return pairing;
};

const claimPairing = async (code) => {
  const result = await api(`/api/extension/pair?code=${encodeURIComponent(code)}`);
  if (result.status === "approved") await chrome.storage.local.set({ token: result.token, email: result.email });
  return result;
};

const disconnect = () => chrome.storage.local.remove(["token", "email"]);

const readActiveTabJob = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return { detected: false, reason: "NO_TAB" };
  try {
    return await chrome.tabs.sendMessage(tab.id, { type: "READ_JOB" });
  } catch {
    return { detected: false, reason: "NO_CONTENT_SCRIPT" };
  }
};

const captureJob = (job) => api("/api/extension/jobs", { method: "POST", body: JSON.stringify(job) });

const askActiveTab = async (type) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return { open: false, questions: [], reason: "NO_TAB" };
  try {
    return await chrome.tabs.sendMessage(tab.id, { type });
  } catch {
    return { open: false, questions: [], reason: "NO_CONTENT_SCRIPT" };
  }
};

const readActiveTabQuestions = () => askActiveTab("READ_QUESTIONS");
const startObserver = () => askActiveTab("START_OBSERVER");
const stopObserver = () => askActiveTab("STOP_OBSERVER");

const requestAnswers = (payload) =>
  api("/api/extension/answers", { method: "POST", body: JSON.stringify(payload) });

const saveAnswer = (payload) =>
  api("/api/extension/answers/save", { method: "POST", body: JSON.stringify(payload) });

const downloadCv = async ({ cvId, filename }) => {
  const { apiBase, token } = await settings();
  const response = await fetch(`${apiBase}/api/extension/cv/${encodeURIComponent(cvId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Could not download the CV (HTTP ${response.status})`);
  const blob = await response.blob();
  const url = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
  await chrome.downloads.download({ url, filename: filename || "cv.pdf", saveAs: false });
  return { downloaded: true };
};

const HANDLERS = {
  startPairing, claimPairing, disconnect, settings,
  readActiveTabJob, captureJob,
  readActiveTabQuestions, startObserver, stopObserver,
  requestAnswers, saveAnswer, downloadCv,
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handler = HANDLERS[message?.type];
  if (!handler) return false;
  Promise.resolve(handler(message.payload))
    .then((data) => sendResponse({ ok: true, data }))
    .catch((error) => sendResponse({ ok: false, error: error.message, status: error.status }));
  return true;
});

chrome.action.onClicked.addListener((tab) => chrome.sidePanel.open({ windowId: tab.windowId }));

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
});
