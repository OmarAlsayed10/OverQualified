import { COLORS } from '../../theme/tokens';

export const roadmapPalette = {
  primary: COLORS.primary,
  dark: COLORS.bgDark,
  sand: COLORS.bgLight,
  ink: COLORS.textPrimary,
  muted: COLORS.textSecondary,
  amber: COLORS.accentOrange,
};

export const categoryLabels: Record<string, string> = {
  skill: 'Requirement category: skill',
  experience: 'Requirement category: experience',
  education: 'Requirement category: education',
  certification: 'Requirement category: certification',
  eligibility: 'Requirement category: eligibility',
  responsibility: 'Requirement category: responsibility',
};
