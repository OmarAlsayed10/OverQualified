const MAX_DESCRIPTION = 40000;

const elementText = (node) => (node ? node.innerText ?? node.textContent ?? "" : "");

const firstText = (selectors) => {
  for (const selector of selectors) {
    const node = document.querySelector(selector);
    const value = elementText(node).trim();
    if (value) return value;
  }
  return "";
};

const jsonLdJobPosting = () => {
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    let parsed;
    try {
      parsed = JSON.parse(script.textContent || "");
    } catch {
      continue;
    }
    const graph = Array.isArray(parsed) ? parsed : parsed["@graph"] || [parsed];
    const posting = graph.find((entry) => entry && entry["@type"] === "JobPosting");
    if (posting) return posting;
  }
  return null;
};

const locationFromJsonLd = (posting) => {
  const address = [].concat(posting.jobLocation || [])[0]?.address;
  if (!address) return "";
  return [address.addressLocality, address.addressRegion, address.addressCountry]
    .map((part) => (typeof part === "object" ? part?.name : part))
    .filter(Boolean)
    .join(", ");
};

const stripTags = (html) => {
  const holder = document.createElement("div");
  holder.innerHTML = html || "";
  return elementText(holder).trim();
};

const SELECTOR_PACK = {
  "linkedin.com": {
    title: [".job-details-jobs-unified-top-card__job-title", ".topcard__title", "h1"],
    company: [".job-details-jobs-unified-top-card__company-name", ".topcard__org-name-link"],
    location: [".job-details-jobs-unified-top-card__tertiary-description-container", ".topcard__flavor--bullet"],
    description: ["#job-details", ".description__text", ".jobs-description__content"],
    form: [".jobs-easy-apply-modal", '[data-test-modal][role="dialog"]', 'div[role="dialog"]'],
  },
  "wuzzuf.net": {
    title: ["h1"],
    company: ['[class*="company"] a', 'meta[property="og:site_name"]'],
    location: ['[class*="location"]'],
    description: ['[class*="job-description"]', "main"],
    form: ["form", 'div[role="dialog"]'],
  },
  default: {
    title: ["h1"],
    company: ['[class*="company"]'],
    location: ['[class*="location"]'],
    description: ["main", "article"],
    form: ['div[role="dialog"]', "form"],
  },
};

const packForHost = () => {
  const host = location.hostname.replace(/^www\./, "");
  const key = Object.keys(SELECTOR_PACK).find((candidate) => host.endsWith(candidate));
  return SELECTOR_PACK[key || "default"];
};

const boardName = () => location.hostname.replace(/^www\./, "").split(".").slice(-2, -1)[0] || "web";

const readJob = () => {
  const posting = jsonLdJobPosting();
  const pack = packForHost();
  const job = posting
    ? {
        title: posting.title || firstText(pack.title),
        company: posting.hiringOrganization?.name || firstText(pack.company),
        location: locationFromJsonLd(posting) || firstText(pack.location),
        description: stripTags(posting.description) || firstText(pack.description),
        postedAt: posting.datePosted || null,
        via: "json-ld",
      }
    : {
        title: firstText(pack.title),
        company: firstText(pack.company),
        location: firstText(pack.location),
        description: firstText(pack.description),
        postedAt: null,
        via: "selectors",
      };

  return {
    ...job,
    description: (job.description || "").slice(0, MAX_DESCRIPTION),
    url: location.href,
    board: boardName(),
    detected: Boolean(job.title),
  };
};

const SKIP_INPUT_TYPES = new Set(["hidden", "submit", "button", "file", "image", "reset", "password"]);
const CONTROL_SELECTOR = "input, textarea, select";

const escapeSelector = (value) =>
  typeof CSS !== "undefined" && CSS.escape
    ? CSS.escape(value)
    : String(value).replace(/[^a-zA-Z0-9_-]/g, (character) => `\\${character}`);

const labelFor = (field, container) => {
  if (field.id) {
    const tied = container.querySelector(`label[for="${escapeSelector(field.id)}"]`);
    const text = elementText(tied).trim();
    if (text) return text;
  }
  const wrapping = field.closest("label");
  if (wrapping) {
    const text = elementText(wrapping).trim();
    if (text) return text;
  }
  const described = field.getAttribute("aria-label") || field.getAttribute("placeholder");
  if (described && described.trim()) return described.trim();
  const group = field.closest("fieldset, [role='group'], [data-test-form-element]");
  const legend = group && group.querySelector("legend, label, span");
  return elementText(legend).trim();
};

const fieldType = (field) => {
  const tag = field.tagName.toLowerCase();
  if (tag === "select") return "select";
  if (tag === "textarea") return "textarea";
  const type = (field.getAttribute("type") || "text").toLowerCase();
  if (type === "radio") return "radio";
  if (type === "checkbox") return "checkbox";
  if (type === "number") return "number";
  return "text";
};

const optionsFor = (field, container) => {
  if (field.tagName.toLowerCase() === "select") {
    return Array.from(field.options).map((option) => option.textContent.trim()).filter(Boolean);
  }
  if (fieldType(field) !== "radio" || !field.name) return undefined;
  const siblings = Array.from(container.querySelectorAll(`input[type="radio"][name="${escapeSelector(field.name)}"]`));
  return siblings.map((sibling) => labelFor(sibling, container)).filter(Boolean);
};

const readQuestions = () => {
  const pack = packForHost();
  const container = pack.form.map((selector) => document.querySelector(selector)).find(Boolean);
  if (!container) return { open: false, questions: [] };

  const seenRadioGroups = new Set();
  const questions = [];

  for (const field of container.querySelectorAll(CONTROL_SELECTOR)) {
    const type = fieldType(field);
    if (field.disabled || SKIP_INPUT_TYPES.has((field.getAttribute("type") || "").toLowerCase())) continue;
    if (type === "radio") {
      if (!field.name || seenRadioGroups.has(field.name)) continue;
      seenRadioGroups.add(field.name);
    }
    const label = labelFor(field, container);
    if (!label || label.length < 2) continue;

    const maxLength = Number(field.getAttribute("maxlength"));
    questions.push({
      id: field.id || field.name || `q${questions.length}`,
      label: label.slice(0, 400),
      type,
      options: optionsFor(field, container),
      maxLength: Number.isInteger(maxLength) && maxLength > 0 ? maxLength : undefined,
      required: field.required || field.getAttribute("aria-required") === "true",
    });
  }
  return { open: true, questions };
};

const overqualifiedDetector = { readJob, readQuestions, jsonLdJobPosting, packForHost, boardName };

if (typeof module !== "undefined" && module.exports) module.exports = overqualifiedDetector;
else globalThis.overqualifiedDetector = overqualifiedDetector;
