const { readQuestions } = require("../src/detector");

const load = (bodyHtml, url = "https://www.linkedin.com/jobs/view/123") => {
  document.documentElement.innerHTML = `<head></head><body>${bodyHtml}</body>`;
  const parsed = new URL(url);
  delete window.location;
  window.location = { href: url, hostname: parsed.hostname };
};

const modal = (inner) => `<div role="dialog" class="jobs-easy-apply-modal">${inner}</div>`;

describe("readQuestions", () => {
  test("reports closed when no form is on the page", () => {
    load("<p>just a job description</p>");
    expect(readQuestions()).toEqual({ open: false, questions: [] });
  });

  test("reads a text field labelled with for/id", () => {
    load(modal(`<label for="q1">Why do you want this role?</label><textarea id="q1" maxlength="300"></textarea>`));
    expect(readQuestions().questions).toEqual([
      { id: "q1", label: "Why do you want this role?", type: "textarea", options: undefined, maxLength: 300, required: false },
    ]);
  });

  test("captures select options", () => {
    load(modal(`
      <label for="notice">Notice period</label>
      <select id="notice"><option>Immediate</option><option>1 month</option><option>3 months</option></select>`));
    const [question] = readQuestions().questions;
    expect(question).toMatchObject({ type: "select", options: ["Immediate", "1 month", "3 months"] });
  });

  test("collapses a radio group into one question with its options", () => {
    load(modal(`
      <fieldset>
        <legend>Do you need visa sponsorship?</legend>
        <label><input type="radio" name="visa" value="y">Yes</label>
        <label><input type="radio" name="visa" value="n">No</label>
      </fieldset>`));
    const questions = readQuestions().questions;
    expect(questions).toHaveLength(1);
    expect(questions[0]).toMatchObject({ type: "radio", options: ["Yes", "No"] });
  });

  test("falls back to aria-label and placeholder", () => {
    load(modal(`<input type="number" aria-label="Years of experience" id="yoe">`));
    expect(readQuestions().questions[0]).toMatchObject({ label: "Years of experience", type: "number" });
  });

  test("marks required fields", () => {
    load(modal(`<label for="p">Phone</label><input id="p" type="text" required>`));
    expect(readQuestions().questions[0].required).toBe(true);
  });

  test("skips hidden, file, submit and disabled controls", () => {
    load(modal(`
      <label for="a">Real question</label><input id="a" type="text">
      <label for="b">Hidden</label><input id="b" type="hidden">
      <label for="c">Resume</label><input id="c" type="file">
      <label for="d">Send</label><input id="d" type="submit">
      <label for="e">Off</label><input id="e" type="text" disabled>`));
    const labels = readQuestions().questions.map((question) => question.label);
    expect(labels).toEqual(["Real question"]);
  });

  test("skips controls with no usable label", () => {
    load(modal(`<input type="text" id="nolabel">`));
    expect(readQuestions().questions).toEqual([]);
  });

  test("reads a Wuzzuf form container", () => {
    load(`<form><label for="q">Expected salary</label><input id="q" type="text"></form>`, "https://wuzzuf.net/jobs/p/1");
    expect(readQuestions()).toMatchObject({ open: true, questions: [{ label: "Expected salary" }] });
  });
});
