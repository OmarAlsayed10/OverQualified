import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import { useTranslation } from 'react-i18next';
import planCard from './planCard.tokens';
import { formatCountdown, msLeftInCycle } from './offerCycle';

// The ticking state lives here rather than in PlanCard so the second-by-second re-render
// touches this line only, not the price, the features and the buttons above it.
const OfferCountdown = () => {
  const { t } = useTranslation();
  const [msLeft, setMsLeft] = useState(msLeftInCycle);

  useEffect(() => {
    const tick = setInterval(() => setMsLeft(msLeftInCycle()), 1000);
    return () => clearInterval(tick);
  }, []);

  return (
    <Box sx={planCard.offerTimer}>
      <AccessTimeRoundedIcon sx={{ fontSize: 16 }} />
      <Typography component="span" sx={planCard.offerTimerText}>
        {t('Offer ends in')} {formatCountdown(msLeft)}
      </Typography>
    </Box>
  );
};

export default OfferCountdown;
