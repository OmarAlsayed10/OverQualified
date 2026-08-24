import type { BuilderFormData, CvSection } from '../../redux/store/slices/cvBuilderSlice';
import { bulletLines } from '../../templates/bulletLines.ts';
import { countTotalSkills } from './skillCategories';

// `message` is an i18n key with {{placeholders}}; the caller resolves it with `values` so the
// counts inside a suggestion do not break translation lookup.
export interface CvCheck {
  id: string;
  section: CvSection;
  severity: 'warning' | 'tip';
  message: string;
  values?: Record<string, string | number>;
}

// Thresholds mirror BACKEND/src/services/cvScoring (objectiveScores.ts, constants.ts). They are
// duplicated because the frontend cannot import from the backend — keep both sides in step, or
// the builder will call a CV good that the analysis report then marks down.
const MIN_SKILLS = 8;
const MIN_SUMMARY_WORDS = 20;
const MAX_PAGES = 2;
const MIN_QUANTIFIED_RATIO = 0.5;

// A recruiter-readable floor of 9pt = 12px at 96 DPI. Body text in the templates is 0.88rem
// (14.08px), so anything under this scale prints smaller than 9pt.
export const MIN_READABLE_FONT_SCALE = 12 / 14.08;

// Kept character-for-character identical to ACTION_VERB in the backend constants.
const ACTION_VERB =
  /^(achieved|accelerated|administered|advised|analy[sz]ed|architected|arranged|assessed|assisted|audited|authored|automated|briefed|built|championed|collaborated|communicated|compiled|completed|conducted|consolidated|contributed|controlled|converted|coordinated|counseled|created|cut|decreased|defined|delivered|demonstrated|deployed|designed|developed|devised|diagnosed|directed|documented|doubled|drafted|drove|eliminated|engineered|enhanced|ensured|escalated|established|evaluated|examined|executed|expanded|facilitated|forecast|formulated|generated|grew|guided|handled|headed|identified|implemented|improved|increased|influenced|initiated|inspected|installed|instructed|integrated|interpreted|introduced|investigated|launched|led|maintained|managed|maximized|mentored|minimized|modernized|monitored|negotiated|operated|optimized|organized|overhauled|oversaw|performed|pioneered|planned|prepared|presented|prevented|processed|produced|promoted|provided|published|ran|rebuilt|recommended|recorded|recruited|reduced|refactored|reported|researched|resolved|restructured|reviewed|revamped|saved|scaled|scheduled|secured|simplified|sold|sourced|spearheaded|standardi[sz]ed|streamlined|strengthened|supervised|supported|sustained|tested|tracked|trained|transformed|translated|troubleshot|upgraded|validated|verified|wrote)\b/i;

// Mirrors WEAK_OPENER / startsWithActionVerb in the backend constants. The list above can never
// hold every past-tense verb ("Boosted", "Revitalized"), so bullets that did open with a real verb
// were still called weak. Any -ed opener counts; the list stays for irregulars (led, built, ran),
// and the openers below stay weak because vague duty phrasing is what the check is for.
const WEAK_OPENER =
  /^(responsib\w*|dut(y|ies)|task\w*|help\w*|work\w*|used?|using|participat\w*|involv\w*|various)\b/i;

const startsWithActionVerb = (line: string): boolean => {
  const text = line.trim();
  return !WEAK_OPENER.test(text) && (ACTION_VERB.test(text) || /^[a-z]+ed\b/i.test(text));
};

// The order the analysis rewards: Summary → Experience → Skills → Education. Sections the
// builder has but the scorer does not care about are free to sit anywhere.
const PREFERRED_ORDER: CvSection[] = ['personal', 'experience', 'skills', 'education'];

export const preferredSectionOrder = (sectionOrder: CvSection[]): CvSection[] => [
  ...PREFERRED_ORDER.filter((section) => sectionOrder.includes(section)),
  ...sectionOrder.filter((section) => !PREFERRED_ORDER.includes(section)),
];

const filledEntries = <T extends Record<string, any>>(entries: T[], key: keyof T): T[] =>
  entries.filter((entry) => String(entry?.[key] ?? '').trim());

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const NUMERIC_DATE = /^(0?[1-9]|1[0-2])[/\-.]((?:19|20)\d{2})$/;

// Both date fields are free text, so a CV assembled from an upload plus hand-typed entries ends up
// with "10/2020" in Education and "Aug 2025" in Experience. Mirrors detectDateStyles in
// BACKEND/src/services/cvScoring/textParse.ts: year-only and month-year are one family, and only a
// numeric date sitting among them is the clash the analysis marks down.
const cvDates = (formData: BuilderFormData): string[] => [
  ...formData.experience.flatMap((job) => [job.startDate, job.endDate]),
  ...formData.education.flatMap((school) => [school.startYear, school.endYear]),
].map((date) => String(date ?? '').trim()).filter(Boolean);

export const detectDateStyles = (formData: BuilderFormData): string[] => {
  const dates = cvDates(formData);
  const styles: string[] = [];
  if (dates.some((date) => !NUMERIC_DATE.test(date))) styles.push('spelled-out');
  if (dates.some((date) => NUMERIC_DATE.test(date))) styles.push('numeric');
  return styles;
};

// The odd date is usually the Education one, and sending the user to Experience to look for it is
// why applying the suggestion read as doing nothing.
export const numericDateSection = (formData: BuilderFormData): CvSection => {
  const isNumeric = (date: string) => NUMERIC_DATE.test(String(date ?? '').trim());
  const inEducation = formData.education.some((school) => isNumeric(school.startYear) || isNumeric(school.endYear));
  return inEducation ? 'education' : 'experience';
};

// "10/2020" becomes "Oct 2020", which is the family the rest of the CV already uses. Anything that
// is not a bare month/year — a plain year, "Present", a range someone typed by hand — is left alone.
export const spellOutDate = (date: string): string => {
  const parts = String(date ?? '').trim().match(NUMERIC_DATE);
  return parts ? `${MONTH_NAMES[Number(parts[1]) - 1]} ${parts[2]}` : date;
};

export const spellOutCvDates = (formData: BuilderFormData): BuilderFormData => ({
  ...formData,
  experience: formData.experience.map((job) => ({
    ...job,
    startDate: spellOutDate(job.startDate),
    endDate: spellOutDate(job.endDate),
  })),
  education: formData.education.map((school) => ({
    ...school,
    startYear: spellOutDate(school.startYear),
    endYear: spellOutDate(school.endYear),
  })),
});

export const hasWeakBullets = (description: string): boolean =>
  bulletLines(description).some((bullet) => !startsWithActionVerb(bullet));

export const runCvChecks = (
  formData: BuilderFormData,
  sectionOrder: CvSection[],
  pageCount: number,
  fontScale: number,
): CvCheck[] => {
  const checks: CvCheck[] = [];
  const personal = formData.personalInfo;
  const experience = filledEntries(formData.experience, 'jobTitle');
  const bullets = experience.flatMap((job) => bulletLines(job.description || ''));

  if (fontScale < MIN_READABLE_FONT_SCALE) {
    checks.push({
      id: 'font-too-small',
      section: 'personal',
      severity: 'warning',
      message: 'Your text is under 9pt. Recruiters skim — cut a bullet instead of shrinking the font.',
    });
  }

  if (pageCount > MAX_PAGES) {
    checks.push({
      id: 'too-many-pages',
      section: 'experience',
      severity: 'warning',
      message: 'Your CV is {{pages}} pages. Keep it to 1–2 by trimming the oldest or least relevant roles.',
      values: { pages: pageCount },
    });
  }

  if (!personal.email.trim() || !personal.phone.trim()) {
    checks.push({
      id: 'missing-contact',
      section: 'personal',
      severity: 'warning',
      message: 'Add both an email and a phone number so recruiters can reach you.',
    });
  }

  const summaryWords = personal.ProfessionalSummary.trim().split(/\s+/).filter(Boolean).length;
  if (summaryWords < MIN_SUMMARY_WORDS) {
    checks.push({
      id: 'summary-too-short',
      section: 'personal',
      severity: 'tip',
      message: 'Your summary is {{words}} words. Aim for {{target}}+ covering your role, years, and strongest result.',
      values: { words: summaryWords, target: MIN_SUMMARY_WORDS },
    });
  }

  const orderInCv = PREFERRED_ORDER.filter((section) => sectionOrder.includes(section))
    .sort((a, b) => sectionOrder.indexOf(a) - sectionOrder.indexOf(b));
  const followsPreferredOrder = orderInCv.every(
    (section, index) => section === PREFERRED_ORDER[index],
  );
  if (!followsPreferredOrder) {
    checks.push({
      id: 'section-order',
      section: 'experience',
      severity: 'tip',
      message: 'Drag your sections into Summary → Experience → Skills → Education. That is the order ATS parsers expect.',
    });
  }

  const skillCount = countTotalSkills(formData.skills.skillCategories);
  if (skillCount < MIN_SKILLS) {
    checks.push({
      id: 'too-few-skills',
      section: 'skills',
      severity: 'tip',
      message: 'You listed {{count}} skills. {{target}}+ gives keyword matching something to work with.',
      values: { count: skillCount, target: MIN_SKILLS },
    });
  }

  // The analysis scores the share of bullets carrying a number and starts deducting below half.
  // Firing only when every last bullet was bare let a CV with two numbers in fourteen bullets pass
  // the builder and then come back with a 1/10 for Impact.
  const unquantified = bullets.filter((bullet) => !/\d/.test(bullet)).length;
  if (bullets.length > 0 && unquantified / bullets.length > 1 - MIN_QUANTIFIED_RATIO) {
    checks.push({
      id: 'no-numbers',
      section: 'experience',
      severity: 'tip',
      message: 'Optional: {{count}} of your {{total}} bullets have no number. Where you have real figures — team size, %, revenue, time saved — they read stronger.',
      values: { count: unquantified, total: bullets.length },
    });
  }

  const dateStyles = detectDateStyles(formData);
  if (dateStyles.length > 1) {
    checks.push({
      id: 'mixed-dates',
      section: numericDateSection(formData),
      severity: 'tip',
      message: 'Your dates use {{styles}} formats. Pick one — recruiters and parsers both read a mixed CV as sloppy.',
      values: { styles: dateStyles.join(' and ') },
    });
  }

  const weakBullets = bullets.filter((bullet) => !startsWithActionVerb(bullet)).length;
  if (weakBullets > 0) {
    checks.push({
      id: 'weak-verbs',
      section: 'experience',
      severity: 'tip',
      message: '{{count}} of your bullets do not start with an action verb (Built, Led, Reduced…).',
      values: { count: weakBullets },
    });
  }

  return checks;
};
