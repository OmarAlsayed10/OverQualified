import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../../theme/tokens';
import type { ApplicationPreparation, PreparationStepId } from './applicationWorkspace.types';

const stepLabels: Record<PreparationStepId, string> = {
  cvAnalysis: 'Analyze CV quality',
  careerMatch: 'Match CV to vacancy',
  coverLetter: 'Generate cover letter',
  cvVariants: 'Generate tailored CV variants',
  screeningAnswers: 'Prepare screening answers',
};

interface PreparationProgressProps {
  preparation: ApplicationPreparation;
  disabled?: boolean;
  onPrepare: () => void;
}

export const PreparationProgress = ({ preparation, disabled, onPrepare }: PreparationProgressProps) => {
  const { t } = useTranslation();
  const running = preparation.status === 'running';
  const finished = preparation.status === 'completed' || preparation.status === 'completed_with_errors';

  return (
    <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3 }, mb: 3, borderRadius: 3, border: `1px solid ${COLORS.borderLight}` }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2} alignItems={{ sm: 'center' }}>
        <Box>
          <Typography variant="h6" fontWeight={800}>{t('Application preparation')}</Typography>
          <Typography variant="body2" color="text.secondary">{t('Your application assets are generated and saved one step at a time.')}</Typography>
        </Box>
        {!running && (
          <Button variant="contained" disabled={disabled} onClick={onPrepare} sx={{ bgcolor: COLORS.primary, color: COLORS.onAccent, '&:hover': { bgcolor: COLORS.primarySurfaceDark } }}>
            {t(finished ? 'Prepare again' : 'Start preparation')}
          </Button>
        )}
      </Stack>
      <Stack spacing={1.25} mt={2.5}>
        {preparation.steps.map((step) => (
          <Stack key={step.id} direction="row" gap={1.25} alignItems="center">
            {step.status === 'running' && <CircularProgress size={20} />}
            {step.status === 'completed' && <CheckCircleIcon color="success" fontSize="small" />}
            {step.status === 'failed' && <ErrorOutlineIcon color="error" fontSize="small" />}
            {step.status === 'pending' && <RadioButtonUncheckedIcon sx={{ color: COLORS.textSecondary, fontSize: 20 }} />}
            <Box>
              <Typography fontWeight={step.status === 'running' ? 800 : 600}>{t(stepLabels[step.id])}</Typography>
              {step.error && <Typography variant="caption" color="error">{t(step.error)}</Typography>}
            </Box>
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
};
