import { Box, Typography, IconButton } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FOOTER_SOCIAL_LINKS } from '../../../../../constants/footerData';
import footerBrand from './footerBrand.tokens';

const FooterBrand = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <>
      <Box display="flex" alignItems="center" gap={1} sx={footerBrand.logoRow} onClick={() => navigate('/')}>
        <Box sx={footerBrand.logoIconBox}>
          <AutoAwesomeIcon sx={footerBrand.logoIcon} />
        </Box>
        <Typography variant="h6" fontWeight={700} sx={footerBrand.logoText}>
          OverQualified
        </Typography>
      </Box>

      <Typography variant="body2" sx={footerBrand.subtitle}>
        {t('footer.subtitle') || 'AI-powered CV builder and analyzer helping you land your dream job faster.'}
      </Typography>

      <Box sx={footerBrand.socialRow}>
        {FOOTER_SOCIAL_LINKS.map((social, i) => (
          <IconButton
            key={i}
            href={social.href}
            target="_blank"
            size="small"
            sx={footerBrand.socialBtn}
          >
            {social.icon}
          </IconButton>
        ))}
      </Box>
    </>
  );
};

export default FooterBrand;
