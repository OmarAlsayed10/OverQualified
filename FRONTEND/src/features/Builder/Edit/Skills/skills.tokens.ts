import { COLORS, RADIUS } from '../../../../theme/tokens';

const skills = {
  root: {
    width: '100%',
    margin: '0 auto',
    borderRadius: RADIUS.md,
    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: COLORS.textDark,
    mb: 2,
    textAlign: 'start',
  },
  categoryCard: {
    border: `1px solid ${COLORS.borderLight}`,
    borderRadius: RADIUS.md,
    p: 2,
    mb: 2,
    backgroundColor: COLORS.bgRaised,
  },
  categoryHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 1,
    mb: 1.5,
  },
  addButton: {
    border: `1px dashed ${COLORS.borderMedium}`,
    borderColor: COLORS.borderMedium,
    color: COLORS.textPrimary,
    '&:hover': {
      borderColor: COLORS.primary,
      color: COLORS.primary,
      backgroundColor: COLORS.primaryAlpha12,
    },
    fontSize: '0.8rem',
    padding: '6px 14px',
    boxShadow: 'none',
    mt: 1,
    height: 'fit-content',
  },
  skillsAreaEmpty: {
    minHeight: '40px',
    border: `1px dashed ${COLORS.disabled}`,
    borderRadius: RADIUS.md,
    padding: '8px',
    backgroundColor: COLORS.surfaceSubtle,
    display: 'flex',
    justifyContent: 'flex-start',
  },
  skillsAreaFilled: {
    minHeight: '40px',
    display: 'flex',
    justifyContent: 'flex-start',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  chipDeleteIcon: {
    color: COLORS.danger,
  },
} as const;

export default skills;
