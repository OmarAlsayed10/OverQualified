import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../../../../theme/tokens';
import { LOADING_STEPS } from './config';

interface LoadingStateProps {
  stepIndex: number;
}

export const LoadingState = ({ stepIndex }: LoadingStateProps) => {
  const { t } = useTranslation();
  return (
    <Box sx={{ display: 'flex', gap: 4, p: 3, flexWrap: 'wrap' }}>
      <Box sx={{ flex: 1, minWidth: 220 }}>
        <Box sx={{ p: 3, borderRadius: '16px', border: `1px solid ${COLORS.borderLight}`, bgcolor: COLORS.bgLight }}>
          {[80, 60, 90, 50, 70, 60, 85, 45, 75, 65, 55, 80].map((w, i) => (
            <Box
              key={i}
              sx={{
                height: i % 4 === 0 ? 14 : 8, borderRadius: 4,
                bgcolor: i % 4 === 0 ? COLORS.primaryAlpha20 : COLORS.borderMedium,
                width: `${w}%`, mb: i % 4 === 0 ? 2 : 1,
                mt: i % 4 === 0 && i !== 0 ? 2 : 0,
                animation: 'pulse 1.5s ease-in-out infinite',
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </Box>
      </Box>

      <Box sx={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <AutoFixHighIcon sx={{ color: COLORS.primary }} />
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: COLORS.textPrimary }}>
            {t('AI is optimizing your CV')}
          </Typography>
        </Box>
        {LOADING_STEPS.map((step, i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {i < stepIndex ? (
              <CheckCircleIcon sx={{ color: COLORS.primary, fontSize: 22 }} />
            ) : i === stepIndex ? (
              <CircularProgress size={20} sx={{ color: COLORS.primary }} />
            ) : (
              <RadioButtonUncheckedIcon sx={{ color: COLORS.borderMedium, fontSize: 22 }} />
            )}
            <Typography
              sx={{
                fontSize: '0.9rem',
                color: i <= stepIndex ? COLORS.textPrimary : COLORS.textSecondary,
                fontWeight: i === stepIndex ? 600 : 400,
                transition: 'all 0.3s',
              }}
            >
              {t(step)}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};
