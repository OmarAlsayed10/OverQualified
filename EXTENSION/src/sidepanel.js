const el = (id) => document.getElementById(id);
const send = (type, payload) =>
  chrome.runtime.sendMessage({ type, payload }).then((reply) => {
    if (!reply?.ok) throw Object.assign(new Error(reply?.error || "Unknown error"), { status: reply?.status });
    return reply.data;
  });

const POLL_INTERVAL_MS = 2000;
const POLL_ATTEMPTS = 90;
const COPIED_FEEDBACK_MS = 1500;
const PICKER_TYPES = new Set(["select", "radio", "checkbox"]);

let currentJob = null;
let selectedCvId = null;
let preparing = false;
const answered = new Map();

const setStatus = (message) => { el("status").textContent = message || ""; };

const showWorkspace = (email) => {
  el("connect").hidden = true;
  el("workspace").hidden = false;
  el("disconnect").hidden = false;
  el("account").textContent = `Connected as ${email || "your account"}`;
};

const showConnect = () => {
  el("connect").hidden = false;
  el("workspace").hidden = true;
  el("disconnect").hidden = true;
};

const refresh = async () => {
  const stored = await chrome.storage.local.get(["apiBase", "token", "email"]);
  el("api-base").value = stored.apiBase || "http://localhost:3001";
  if (stored.token) { showWorkspace(stored.email); scanJob(); } else showConnect();
};

const pollForApproval = async (code) => {
  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    const result = await send("claimPairing", code);
    if (result.status === "approved") return result;
    if (result.status === "expired") throw new Error("That code expired. Try again.");
  }
  throw new Error("Timed out waiting for approval.");
};

async function scanJob() {
  const job = await send("readActiveTabJob");
  if (!job?.detected) {
    setStatus(job?.reason === "NO_CONTENT_SCRIPT"
      ? "Open a job page on LinkedIn or Wuzzuf, then reload it."
      : "No job found on this page.");
    return;
  }
  currentJob = job;
  el("job-title").textContent = job.title;
  el("job-company").textContent = job.company || "Unknown company";
  el("job-location").textContent = job.location || "Location not listed";
  el("job-via").textContent = job.via === "json-ld" ? "structured data" : "page selectors";
  el("job").hidden = false;
  setStatus("Saving job…");
  try {
    const saved = await send("captureJob", job);
    renderCvChoices(saved.cvs, saved.suggestedCv);
    el("prepare").hidden = false;
    setStatus("");
  } catch (error) {
    setStatus(error.status === 401 ? "Session expired. Reconnect." : error.message);
  }
}

const renderCvChoices = (cvs, suggested) => {
  if (!cvs?.length) {
    setStatus("Add a CV on the website to prepare answers.");
    return;
  }
  const select = el("cv-select");
  select.replaceChildren(...cvs.map((cv) => {
    const option = document.createElement("option");
    option.value = cv.id;
    option.textContent = `${cv.title} — ${cv.fitScore}%${cv.isPrimary ? " (primary)" : ""}`;
    return option;
  }));
  selectedCvId = suggested?.id ?? cvs[0].id;
  select.value = selectedCvId;
  el("cv-block").hidden = false;
};

const copyButton = (getValue) => {
  const button = document.createElement("button");
  button.className = "copy";
  button.type = "button";
  button.title = "Copy answer";
  button.textContent = "Copy";
  button.addEventListener("click", async () => {
    await navigator.clipboard.writeText(getValue());
    button.textContent = "Copied";
    button.classList.add("copied");
    setTimeout(() => { button.textContent = "Copy"; button.classList.remove("copied"); }, COPIED_FEEDBACK_MS);
  });
  return button;
};

const answerCard = (question, answer) => {
  const item = document.createElement("li");
  item.dataset.questionId = question.id;

  const label = document.createElement("p");
  label.className = "question";
  label.textContent = question.label + (question.required ? " *" : "");
  item.append(label);

  if (PICKER_TYPES.has(question.type)) {
    const instruction = document.createElement("p");
    instruction.className = "instruction";
    instruction.textContent = answer.value ? `Choose: ${answer.value}` : "Pick the option that fits";
    const note = document.createElement("span");
    note.className = "muted small";
    note.textContent = `${question.type} — select it, nothing to paste`;
    item.append(instruction, note);
    return item;
  }

  const row = document.createElement("div");
  row.className = "answer-row";
  const box = document.createElement("textarea");
  box.value = answer.value;
  box.rows = Math.min(6, Math.max(2, Math.ceil(answer.value.length / 60)));
  box.addEventListener("blur", () => {
    if (box.value.trim() === answer.value.trim()) return;
    send("saveAnswer", { cvId: selectedCvId, label: question.label, answer: box.value }).catch(() => {});
  });
  row.append(box, copyButton(() => box.value));

  const note = document.createElement("span");
  note.className = "muted small";
  note.textContent = { profile: "from your profile", cached: "reused from a past application", generated: "generated — edit to make it yours", unanswered: "could not answer — write your own" }[answer.source];

  item.append(row, note);
  return item;
};

const renderAnswers = (questions, answers) => {
  const list = el("answers");
  const byId = new Map(answers.map((answer) => [answer.id, answer]));
  for (const question of questions) {
    if (answered.has(question.id)) continue;
    const answer = byId.get(question.id);
    if (!answer) continue;
    answered.set(question.id, answer);
    list.append(answerCard(question, answer));
  }
  el("answer-count").textContent = String(answered.size);
  el("answers-block").hidden = answered.size === 0;
};

const askFor = async (questions) => {
  const fresh = questions.filter((question) => !answered.has(question.id));
  if (fresh.length === 0 || !currentJob || !selectedCvId) return;
  setStatus("Preparing answers…");
  try {
    const { answers } = await send("requestAnswers", {
      cvId: selectedCvId,
      job: { title: currentJob.title, company: currentJob.company, description: currentJob.description },
      questions: fresh,
    });
    renderAnswers(fresh, answers);
    setStatus("");
  } catch (error) {
    setStatus(error.status === 429 ? "Out of credits." : error.message);
  }
};

el("start-pairing").addEventListener("click", async () => {
  try {
    await chrome.storage.local.set({ apiBase: el("api-base").value.trim().replace(/\/+$/, "") });
    setStatus("Opening approval page…");
    const pairing = await send("startPairing");
    el("pairing-code").textContent = pairing.code;
    el("pairing-hint").hidden = false;
    setStatus("Waiting for you to approve…");
    const approved = await pollForApproval(pairing.code);
    showWorkspace(approved.email);
    setStatus("Connected.");
    scanJob();
  } catch (error) {
    setStatus(error.message);
  }
});

el("disconnect").addEventListener("click", async () => {
  await send("disconnect");
  await send("stopObserver").catch(() => {});
  await refresh();
  setStatus("Disconnected.");
});

el("cv-select").addEventListener("change", (event) => { selectedCvId = event.target.value; });

el("download-cv").addEventListener("click", async () => {
  if (!selectedCvId) return;
  setStatus("Building your CV…");
  try {
    const name = el("cv-select").selectedOptions[0]?.textContent.split(" — ")[0] || "CV";
    await send("downloadCv", { cvId: selectedCvId, filename: `${name.replace(/[^\w -]/g, "")}.pdf` });
    setStatus("Downloaded. Attach it with the site's own upload button.");
  } catch (error) {
    setStatus(error.message);
  }
});

el("prepare").addEventListener("click", async () => {
  if (preparing) return;
  preparing = true;
  el("prepare").disabled = true;
  el("prepare-hint").hidden = false;
  await send("startObserver");
  const current = await send("readActiveTabQuestions");
  if (current?.questions?.length) await askFor(current.questions);
  else setStatus("Open the application form and the questions will appear here.");
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "QUESTIONS_CHANGED" && preparing) askFor(message.payload.questions || []);
});

refresh();
