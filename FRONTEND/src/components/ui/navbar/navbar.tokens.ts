import { COLORS } from '../../../theme/tokens';

const navbar = {
  appBar: {
    backgroundColor: COLORS.bgWhite,
    borderBottom: `1px solid ${COLORS.borderLight}`,
    height: '56px',
    justifyContent: 'center',
  },
  toolbar: {
    minHeight: '56px',
    px: { xs: 1.5, sm: 2, lg: 3 },
  },
  logoDesktop: {
    marginInlineEnd: 2,
    display: { xs: 'none', lg: 'flex' },
    color: COLORS.textPrimary,
    textDecoration: 'none',
    fontWeight: 'bold',
    fontSize: '20px',
    cursor: 'pointer',
    flexShrink: 0,
    alignItems: 'center',
    fontFamily: '"DM Serif Display", serif',
  },
  logoMobile: {
    marginInlineStart: 1,
    display: 'flex',
    flexGrow: 1,
    color: COLORS.textPrimary,
    textDecoration: 'none',
    cursor: 'pointer',
    alignItems: 'center',
    fontFamily: '"DM Serif Display", serif',
  },
  mobileMenuBox: { flexGrow: 1, minWidth: 0, alignItems: 'center', display: { xs: 'flex', lg: 'none' } },
  menuIcon: { color: COLORS.textPrimary },
  brandIcon: { color: COLORS.primary, marginInlineEnd: 1, fontSize: '30px' },
  brandIconSmall: { color: COLORS.primary, marginInlineEnd: 1 },
} as const;

export default navbar;
