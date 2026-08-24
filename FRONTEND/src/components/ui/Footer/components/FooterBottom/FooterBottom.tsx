import { Box, Typography, Divider } from '@mui/material';
import { useTranslation } from 'react-i18next';
import footerBottom from './footerBottom.tokens';

const FooterBottom = () => {
  const { t } = useTranslation();

  return (
    <>
      <Divider sx={footerBottom.divider} />
      <Box sx={footerBottom.row}>
        <Typography sx={footerBottom.copyright}>
          {t('© 2026 OverQualified. All rights reserved.')}
        </Typography>
      </Box>
    </>
  );
};

export default FooterBottom;
