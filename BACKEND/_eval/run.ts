import "dotenv/config";
import * as groqModule from "../src/lib/groqChat";
import { unsourcedNumbers } from "../src/lib/evidenceGrounding";
import { buildCvContext } from "../src/lib/cvContextBuilder";
import { omar, abdulrahman, talha } from "./fixtures";

const meta: { finish?: string; completion?: number; model?: string } = {};
const realGroqChat = groqModule.groqChat;
(groqModule as any).groqChat = async (params: any, opts?: any) => {
  const res = await realGroqChat(params, opts);
  meta.finish = res.choices[0].finish_reason;
  meta.completion = res.usage?.completion_tokens;
  meta.model = res.model;
  return res;
};

const { editFieldWithAI } = require("../src/services/AIWritingService");

type Case = {
  id: string;
  cv: any;
  cvName: string;
  section: string;
  content: string;
  context: any;
  prompt: string;
  wantLines?: number;
  wantSentences?: number;
  wantWords?: number;
  note?: string;
};

const exp = (cv: any, i: number) => ({
  content: cv.experience[i].description,
  context: { jobTitle: cv.experience[i].jobTitle, company: cv.experience[i].company },
});
const proj = (cv: any, i: number) => ({
  content: cv.projects[i].description,
  context: { projectName: cv.projects[i].name, technologies: cv.projects[i].technologies },
});
const summary = (cv: any) => ({ content: cv.personalInfo.ProfessionalSummary, context: {} });

const cases: Case[] = [
  { id: "C01", cvName: "omar", cv: omar, section: "experience", ...exp(omar, 0), prompt: "Shorten this description into 3 lines", wantLines: 3 },
  { id: "C02", cvName: "omar", cv: omar, section: "experience", ...exp(omar, 0), prompt: "shorten description into 3 lines", wantLines: 3 },
  { id: "C03", cvName: "abdulrahman", cv: abdulrahman, section: "experience", ...exp(abdulrahman, 0), prompt: "Shorten this description into 3 lines", wantLines: 3 },
  { id: "C04", cvName: "talha", cv: talha, section: "experience", ...exp(talha, 0), prompt: "Shorten this description into 3 lines", wantLines: 3 },
  { id: "C05", cvName: "omar", cv: omar, section: "projects", ...proj(omar, 0), prompt: "Make it 2 bullets", wantLines: 2 },
  { id: "C06", cvName: "abdulrahman", cv: abdulrahman, section: "experience", ...exp(abdulrahman, 2), prompt: "Make it 2 bullets", wantLines: 2 },
  { id: "C07", cvName: "omar", cv: omar, section: "summary", ...summary(omar), prompt: "Make it 2 sentences", wantSentences: 2 },
  { id: "C08", cvName: "omar", cv: omar, section: "summary", ...summary(omar), prompt: "Shorten to 40 words", wantWords: 40 },
  { id: "C09", cvName: "talha", cv: talha, section: "experience", ...exp(talha, 0), prompt: "Turn this into 3 short bullet points", wantLines: 3 },
  { id: "C10", cvName: "omar", cv: omar, section: "experience", ...exp(omar, 0), prompt: "Make it one line", wantLines: 1 },

  { id: "C11", cvName: "omar", cv: omar, section: "experience", ...exp(omar, 0), prompt: "Make concise" },
  { id: "C12", cvName: "omar", cv: omar, section: "experience", ...exp(omar, 0), prompt: "Add metrics" },
  { id: "C13", cvName: "omar", cv: omar, section: "experience", ...exp(omar, 0), prompt: "Add keywords" },
  { id: "C14", cvName: "omar", cv: omar, section: "experience", ...exp(omar, 1), prompt: "Write description", note: "empty existing content" },
  { id: "C15", cvName: "omar", cv: omar, section: "projects", ...proj(omar, 1), prompt: "Highlight tech stack" },
  { id: "C16", cvName: "abdulrahman", cv: abdulrahman, section: "summary", ...summary(abdulrahman), prompt: "Make shorter" },
  { id: "C17", cvName: "talha", cv: talha, section: "education", content: talha.education[0].description, context: { institution: talha.education[0].institution, degree: talha.education[0].degree }, prompt: "Add coursework" },
  { id: "C18", cvName: "talha", cv: talha, section: "experience", ...exp(talha, 1), prompt: "Add impact" },
  { id: "C19", cvName: "abdulrahman", cv: abdulrahman, section: "skills", content: abdulrahman.skills.skills.join(", "), context: {}, prompt: "Suggest skills" },
  { id: "C20", cvName: "talha", cv: talha, section: "languages", content: talha.skills.languages, context: {}, prompt: "Add proficiency level" },

  { id: "C21", cvName: "omar", cv: omar, section: "experience", ...exp(omar, 0), prompt: "اختصر الوصف إلى ٣ أسطر فقط", wantLines: 3, note: "Arabic instruction, English CV" },
  { id: "C22", cvName: "abdulrahman", cv: abdulrahman, section: "experience", ...exp(abdulrahman, 0), prompt: "Remove the last bullet", wantLines: 3 },
  { id: "C23", cvName: "omar", cv: omar, section: "experience", ...exp(omar, 0), prompt: "Add a bullet about leading the team", note: "no team-lead evidence" },
  { id: "C24", cvName: "talha", cv: talha, section: "experience", ...exp(talha, 0), prompt: "Make it 3 bullets with numbers", wantLines: 3, note: "no numbers exist" },
  { id: "C25", cvName: "omar", cv: omar, section: "summary", ...summary(omar), prompt: "Rewrite for a Senior Frontend Engineer role at a fintech" },
  { id: "C26", cvName: "abdulrahman", cv: abdulrahman, section: "experience", ...exp(abdulrahman, 1), prompt: "Make it more professional" },
];

const lineList = (text: string) =>
  text.split("\n").map((l) => l.trim()).filter(Boolean);
const bulletCount = (text: string) => lineList(text).length;
const sentenceCount = (text: string) =>
  (text.match(/[.!?](\s|$)/g) || []).length;
const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
const arabicChars = (text: string) => (text.match(/[؀-ۿ]/g) || []).length;

const PREAMBLE = /^\s*(sure|certainly|here(?:'s| is| are)|below is|of course|okay|absolutely|i(?:'ve| have)\b)/i;
const MARKDOWN = /(\*\*|^#{1,6}\s|```|^\s*\d+\.\s)/m;
const PRONOUNS = /\b(I|my|me|we|our)\b/;

async function main() {
  const results: any[] = [];
  for (const c of cases) {
    meta.finish = undefined;
    meta.completion = undefined;
    const t0 = Date.now();
    let out = "";
    let error = "";
    try {
      out = await editFieldWithAI(c.section, c.prompt, c.content, c.context, c.cv);
    } catch (e: any) {
      error = e?.message || String(e);
    }
    const ms = Date.now() - t0;

    const sourceText = `${c.content}\n${buildCvContext(c.cv)}`;
    const fails: string[] = [];

    if (error) fails.push(`ERROR:${error}`);
    if (!error && !out.trim()) fails.push("EMPTY");
    if (meta.finish === "length") fails.push(`TRUNCATED(${meta.completion}tok)`);
    if (c.wantLines !== undefined && out) {
      const got = bulletCount(out);
      if (got !== c.wantLines) fails.push(`COUNT want ${c.wantLines} got ${got}`);
    }
    if (c.wantSentences !== undefined && out) {
      const got = sentenceCount(out);
      if (got > c.wantSentences) fails.push(`SENTENCES want <=${c.wantSentences} got ${got}`);
    }
    if (c.wantWords !== undefined && out) {
      const got = wordCount(out);
      if (got > c.wantWords * 1.15) fails.push(`WORDS want <=${c.wantWords} got ${got}`);
    }
    if (PREAMBLE.test(out)) fails.push("PREAMBLE");
    if (MARKDOWN.test(out)) fails.push("MARKDOWN");
    if (PRONOUNS.test(out)) fails.push("PRONOUN");
    if (/\?\s*$/.test(out.trim())) fails.push("ASKS_QUESTION");
    if (arabicChars(c.content) === 0 && arabicChars(out) > 0) fails.push("LANG_DRIFT");
    const invented = out ? unsourcedNumbers(out, sourceText) : [];
    if (invented.length) fails.push(`INVENTED_NUMBERS ${invented.join(",")}`);

    results.push({ ...c, out, ms, fails, finish: meta.finish, completion: meta.completion, model: meta.model });

    console.log("\n" + "=".repeat(78));
    console.log(`${c.id} [${c.cvName}/${c.section}] "${c.prompt}"${c.note ? `  (${c.note})` : ""}`);
    console.log(`model=${meta.model} finish=${meta.finish} tok=${meta.completion} ${ms}ms`);
    console.log(fails.length ? `FAIL: ${fails.join(" | ")}` : "PASS");
    console.log("-".repeat(78));
    console.log(out || `<no output> ${error}`);
  }

  console.log("\n\n" + "#".repeat(78));
  console.log("SUMMARY");
  console.log("#".repeat(78));
  const failed = results.filter((r) => r.fails.length);
  console.log(`${results.length - failed.length}/${results.length} passed\n`);
  const tally: Record<string, number> = {};
  for (const r of failed) {
    for (const f of r.fails) {
      const key = f.split(/[ (:]/)[0];
      tally[key] = (tally[key] || 0) + 1;
    }
    console.log(`  ${r.id} ${r.cvName}/${r.section} "${r.prompt}" -> ${r.fails.join(" | ")}`);
  }
  console.log("\nFailure classes:");
  for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v}`);
  }
  require("fs").writeFileSync(
    __dirname + "/results.json",
    JSON.stringify(results, null, 2)
  );
}

main().then(() => process.exit(0));
