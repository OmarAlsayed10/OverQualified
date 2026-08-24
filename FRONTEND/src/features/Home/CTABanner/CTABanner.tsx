import { Box, Typography, Button } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import ctaBanner from './ctaBanner.tokens';

function CTABanner() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Box sx={ctaBanner.root}>
      <Box sx={ctaBanner.card}>
        <Box sx={ctaBanner.glow} />

        <Box sx={ctaBanner.iconBox}>
          <AutoAwesomeIcon sx={ctaBanner.icon} />
        </Box>

        <Typography variant="h2" sx={ctaBanner.title}>
          {t('Ready to land your')}
          <Box component="span" sx={ctaBanner.titleAccent}>
            {' '}{t('dream job')}?
          </Box>
        </Typography>

        <Typography sx={ctaBanner.subtitle}>
          {t('Build a focused, professional CV with OverQualified. Start today for free.')}
        </Typography>

        <Box sx={ctaBanner.buttonRow}>
          <Button
            variant="contained"
            size="large"
            endIcon={<ArrowForwardIcon />}
            onClick={() => navigate('/getStart')}
            sx={ctaBanner.primaryButton}
          >
            {t('Get Started Free')}
          </Button>
          <Button
            variant="outlined"
            size="large"
            onClick={() => navigate('/payment-check')}
            sx={ctaBanner.outlinedButton}
          >
            {t('View Pricing')}
          </Button>
        </Box>

        <Typography sx={ctaBanner.trust}>
          {t('No credit card required · Free forever plan · Cancel anytime')}
        </Typography>
      </Box>
    </Box>
  );
}

export default CTABanner;
