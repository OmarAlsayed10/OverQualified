import { COLORS, RADIUS, SHADOWS } from '../../../../../theme/tokens';

const desktopNav = {
  root: {
    flexGrow: 1,
    display: { xs: 'none', lg: 'flex' },
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: { lg: 1.5, xl: 3 },
  },
  navLink: (active: boolean) => ({
    position: 'relative',
    color: active ? COLORS.textPrimary : COLORS.textSecondary,
    fontSize: '14px',
    fontWeight: active ? 700 : 500,
    textTransform: 'none',
    minWidth: 0,
    px: 0.5,
    py: 0.5,
    transition: 'color 0.2s',
    '& .MuiButton-endIcon': { ml: 0.25 },
    '& .MuiButton-endIcon svg': { fontSize: 18 },
    '&:hover': { color: COLORS.textPrimary, bgcolor: 'transparent' },
    // Underline grows from the centre; solid on the current page, faint on hover.
    '&::after': {
      content: '""',
      position: 'absolute',
      insetInline: 2,
      bottom: -2,
      height: '2px',
      borderRadius: '2px',
      backgroundColor: COLORS.primary,
      transform: active ? 'scaleX(1)' : 'scaleX(0)',
      opacity: active ? 1 : 0.45,
      transition: 'transform .18s ease, opacity .18s ease',
    },
    '&:hover::after': { transform: 'scaleX(1)' },
  }),
  ctaBtn: { fontSize: '12px' },
  getProBtn: {
    fontSize: '12px',
    borderColor: COLORS.primary,
    color: COLORS.primary,
    '&:hover': { borderColor: COLORS.primaryDark, backgroundColor: COLORS.primaryAlpha12 },
  },
  productsPaper: {
    mt: 1,
    minWidth: 200,
    borderRadius: RADIUS.lg,
    border: `1px solid ${COLORS.borderLight}`,
    boxShadow: SHADOWS.md,
  },
  productsItem: (active: boolean) => ({
    fontSize: '14px',
    fontWeight: active ? 700 : 400,
    color: active ? COLORS.primary : COLORS.textSecondary,
    bgcolor: active ? COLORS.primaryAlpha12 : 'transparent',
    py: 1.15,
    '&:hover': { color: COLORS.textPrimary, bgcolor: COLORS.bgHover },
  }),
} as const;

export default desktopNav;
