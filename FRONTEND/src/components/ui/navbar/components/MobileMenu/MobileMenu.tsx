import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import { User, FileText, Files } from '../../../../icons/MuiIcons';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { MobileMenuProps } from './MobileMenu.types';
import LanguageToggle from '../../../LanguageToggle';
import ThemeToggle from '../../../ThemeToggle';
import mobileMenu from './mobileMenu.tokens';
import { isActivePath } from '../../isActivePath';
import { useFeedback } from '../../../../../context/FeedbackContext';
import { hasPaidAccess } from '../../../../../utils/proAccess';
import { displayName } from '../../../../../utils/displayName';
import { AVATAR_COLORS } from '../../../../../theme/tokens';

const MobileMenu = ({ open, onClose, pages, productPages, isAuthenticated, user, onLogout }: MobileMenuProps) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { showEntitlement } = useFeedback();

  const isAdmin = user?.role === 'admin';
  const isActivePro = hasPaidAccess(user);
  const u = user as (typeof user & { avatarColor?: string; planTier?: string }) | null;
  const color = u?.avatarColor || AVATAR_COLORS[0];
  const initial = user?.firstName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U';
  const planLabel = isAdmin ? 'ADMIN' : (u?.planTier || (isActivePro ? 'pro' : 'basic')).toUpperCase();

  const go = (path: string) => {
    onClose();
    navigate(path);
  };

  const openPage = (page: { href: string; requiresPaid?: boolean }) => {
    onClose();
    if (page.requiresPaid && !isActivePro) {
      showEntitlement('PRO_REQUIRED');
      return;
    }
    navigate(page.href);
  };

  const accountLinks = [
    { label: 'Profile', icon: <User size={17} />, to: '/settings' },
    { label: 'My CVs', icon: <FileText size={17} />, to: '/settings?tab=cv' },
    { label: 'Documents', icon: <Files size={17} />, to: '/settings?tab=documents' },
  ];

  return (
    <Drawer
      anchor={i18n.language === 'ar' ? 'right' : 'left'}
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: mobileMenu.paper } }}
    >
      <Box sx={mobileMenu.topBar}>
        <Typography sx={mobileMenu.brand}>OverQualified</Typography>
        <IconButton onClick={onClose} aria-label={t('Close')} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {isAuthenticated && (
        <Box sx={mobileMenu.account}>
          <Avatar src={user?.photo || ''} sx={{ ...mobileMenu.avatar, bgcolor: color }}>
            {initial}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Typography sx={mobileMenu.userName} noWrap>
                {displayName(user?.firstName, user?.lastName)}
              </Typography>
              <Chip label={planLabel} size="small" color="primary" sx={mobileMenu.planChip} />
            </Box>
            <Typography sx={mobileMenu.userEmail} noWrap>{user?.email}</Typography>
          </Box>
        </Box>
      )}

      <Box sx={mobileMenu.scrollArea}>
        <List disablePadding>
          {pages.slice(0, 1).map((page) => (
            <ListItemButton
              key={page.label}
              selected={isActivePath(pathname, page.href)}
              onClick={() => openPage(page)}
              sx={mobileMenu.navItem(isActivePath(pathname, page.href))}
            >
              <ListItemText
                primary={page.label}
                slotProps={{ primary: { sx: mobileMenu.itemLabel } }}
              />
            </ListItemButton>
          ))}
        </List>

        <List
          disablePadding
          subheader={<ListSubheader disableSticky sx={mobileMenu.sectionLabel}>{t('Products')}</ListSubheader>}
        >
          {productPages.map((page) => (
            <ListItemButton
              key={page.label}
              selected={isActivePath(pathname, page.href)}
              onClick={() => openPage(page)}
              sx={{ ...mobileMenu.nestedItem, ...mobileMenu.navItem(isActivePath(pathname, page.href)) }}
            >
              <ListItemText
                primary={page.label}
                slotProps={{ primary: { sx: mobileMenu.itemLabel } }}
              />
            </ListItemButton>
          ))}
        </List>

        <Divider sx={mobileMenu.divider} />

        <List disablePadding>
          {pages.slice(1).map((page) => (
            <ListItemButton
              key={page.label}
              selected={isActivePath(pathname, page.href)}
              onClick={() => openPage(page)}
              sx={mobileMenu.navItem(isActivePath(pathname, page.href))}
            >
              <ListItemText
                primary={page.label}
                slotProps={{ primary: { sx: mobileMenu.itemLabel } }}
              />
            </ListItemButton>
          ))}
        </List>

        {isAuthenticated && (
          <>
            <Divider sx={mobileMenu.divider} />
            <List
              disablePadding
              subheader={<ListSubheader disableSticky sx={mobileMenu.sectionLabel}>{t('Account')}</ListSubheader>}
            >
              {accountLinks.map((link) => (
                <ListItemButton key={link.to} onClick={() => go(link.to)} sx={mobileMenu.nestedItem}>
                  <ListItemIcon sx={mobileMenu.itemIcon}>{link.icon}</ListItemIcon>
                  <ListItemText primary={t(link.label)} slotProps={{ primary: { sx: mobileMenu.itemLabel } }} />
                </ListItemButton>
              ))}
            </List>
          </>
        )}
      </Box>

      <Divider />

      <Box sx={mobileMenu.langRow}>
        <Typography sx={mobileMenu.langLabel}>{t('Language')}</Typography>
        <LanguageToggle />
      </Box>

      <Box sx={mobileMenu.langRow}>
        <Typography sx={mobileMenu.langLabel}>{t('Theme')}</Typography>
        <ThemeToggle />
      </Box>

      <Divider />

      <Box sx={mobileMenu.footer}>
        {!isAuthenticated && (
          <Button fullWidth variant="contained" onClick={() => go('/login')}>
            {t('LogIn')}
          </Button>
        )}

        {isAdmin && (
          <Button fullWidth variant="contained" onClick={() => go('/admin')}>
            {t('Admin')}
          </Button>
        )}

        {isAuthenticated && !isAdmin && !isActivePro && (
          <Button fullWidth variant="outlined" onClick={() => go('/payment-check')}>
            {t('Go Pro')}
          </Button>
        )}

        {!isAdmin && isActivePro && (
          <Button fullWidth variant="contained" onClick={() => go('/settings?tab=plan')}>
            {t('Pro')}
          </Button>
        )}

        {isAuthenticated && (
          <Button
            fullWidth
            color="error"
            startIcon={<LogoutOutlinedIcon fontSize="small" />}
            onClick={() => { onClose(); onLogout(); }}
            sx={mobileMenu.logout}
          >
            {t('Logout')}
          </Button>
        )}
      </Box>
    </Drawer>
  );
};

export default MobileMenu;
