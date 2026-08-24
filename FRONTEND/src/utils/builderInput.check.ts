import assert from 'node:assert/strict';
import { normalizePastedBulletText } from '../templates/bulletLines.ts';
import { parseLanguageEntries, serializeLanguageEntries } from '../features/Builder/Edit/Skills/languageEntries.ts';
import { createEmptyBuilderFormData } from '../redux/store/slices/cvBuilderSlice.ts';
import { mergeBuilderImprovements } from '../features/Builder/Builder/mergeBuilderImprovements.ts';

assert.equal(
  normalizePastedBulletText('Built the dashboard. Reduced load time using caching. Supported the release.'),
  'Built the dashboard.\nReduced load time using caching.\nSupported the release.',
);
assert.equal(
  normalizePastedBulletText('Worked with the team and supported the production release.'),
  'Worked with the team and supported the production release.',
);
assert.equal(
  normalizePastedBulletText('• Built the dashboard\n• Automated deployment'),
  'Built the dashboard\nAutomated deployment',
);

const languages = parseLanguageEntries('Arabic (Native), English');
assert.deepEqual(languages, [
  { name: 'Arabic', proficiency: 'Native' },
  { name: 'English', proficiency: '' },
]);
assert.equal(serializeLanguageEntries(languages), 'Arabic (Native), English');

const currentForm = createEmptyBuilderFormData();
currentForm.personalInfo.firstName = 'Omar';
currentForm.personalInfo.photo = 'candidate-photo';
currentForm.customSections = [{ id: 'awards', title: 'Awards', items: [] }];
const proposedForm = structuredClone(currentForm);
proposedForm.personalInfo.firstName = 'Changed';
proposedForm.personalInfo.photo = '';
proposedForm.personalInfo.ProfessionalSummary = 'Improved summary';
proposedForm.customSections = [];
const mergedForm = mergeBuilderImprovements(currentForm, proposedForm);
assert.equal(mergedForm.personalInfo.firstName, 'Omar');
assert.equal(mergedForm.personalInfo.photo, 'candidate-photo');
assert.equal(mergedForm.personalInfo.ProfessionalSummary, 'Improved summary');
assert.deepEqual(mergedForm.customSections, currentForm.customSections);

console.log('builder input normalization ok');
