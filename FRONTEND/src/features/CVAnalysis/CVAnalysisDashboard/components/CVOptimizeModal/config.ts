import type { CvSection } from '../../../../../redux/store/slices/cvBuilderSlice';

export const TEMPLATE_SECTIONS: CvSection[] = [
  'personal', 'projects', 'experience', 'education', 'skills', 'languages', 'certifications',
];

export const LOADING_STEPS = [
  'Reading your CV...',
  'Identifying every issue...',
  'Rewriting sections...',
  'Strengthening action verbs...',
  'Optimizing ATS keywords...',
  'Scoring your optimized CV...',
];
