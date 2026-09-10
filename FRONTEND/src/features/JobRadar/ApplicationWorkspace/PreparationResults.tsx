import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import CareerMatchResults from '../../CareerMatch/CareerMatchResults';
import { COLORS } from '../../../theme/tokens';
import type { ApplicationPreparation } from './applicationWorkspace.types';

interface PreparationResultsProps {
  preparation: ApplicationPreparation;
  onCopy: (text: string, label: string) => void;
}

export const PreparationResults = ({ preparation, onCopy }: PreparationResultsProps) => {
  const { t } = useTranslation();
  const analysis = preparation.cvAnalysis;
  const careerMatch = preparation.careerMatch;

  if (!analysis && !careerMatch) return <Alert severity="info">{t('Prepare the application to see its analysis here.')}</Alert>;

  const analysisText = analysis
    ? [`${t('CV Quality')}: ${analysis.qualityScore}/100`, ...analysis.positiveFeedback, ...analysis.negativeFeedback].join('\n')
    : '';

  return (
    <Stack spacing={3}>
      {analysis && (
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${COLORS.borderLight}` }}>
          <Stack direction="row" justifyContent="space-between" gap={2} alignItems="center" mb={2}>
            <Box>
              <Typography variant="h6" fontWeight={800}>{t('CV Analysis')}</Typography>
              <Typography sx={{ color: COLORS.primary, fontSize: 32, fontWeight: 850 }}>{analysis.qualityScore}/100</Typography>
            </Box>
            <Button startIcon={<ContentCopyIcon />} onClick={() => onCopy(analysisText, t('CV Analysis'))}>{t('Copy')}</Button>
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 1.5 }}>
            {analysis.scoreBreakdown.map((score) => (
              <Box key={score.name} sx={{ p: 1.5, borderRadius: 2, bgcolor: COLORS.surfaceSubtle }}>
                <Typography fontWeight={700}>{score.name}</Typography>
                <Typography color="text.secondary">{score.earned}/{score.max}</Typography>
              </Box>
            ))}
          </Box>
          {analysis.positiveFeedback.map((item) => <Typography key={item} sx={{ mt: 1.5 }}>✓ {item}</Typography>)}
          {analysis.negativeFeedback.map((item) => <Typography key={item} color="text.secondary" sx={{ mt: 1 }}>• {item}</Typography>)}
        </Paper>
      )}
      {careerMatch && (
        <Box>
          <Stack direction="row" justifyContent="flex-end" mb={1}>
            <Button startIcon={<ContentCopyIcon />} onClick={() => onCopy(careerMatch.analysis.summary, t('Match Analysis'))}>{t('Copy summary')}</Button>
          </Stack>
          <CareerMatchResults result={careerMatch} />
        </Box>
      )}
    </Stack>
  );
};
