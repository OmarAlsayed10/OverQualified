import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Alert, Box, Button, Paper, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import CvVariantResults, { type CvVariant } from '../components/CvVariantResults';
import type { ApplicationPreparation, ScreeningAnswer } from './applicationWorkspace.types';
import { PreparationResults } from './PreparationResults';

interface WorkspaceTabsProps {
  activeTab: number;
  preparation: ApplicationPreparation;
  coverLetter: string;
  variants: CvVariant[];
  selectedVariantId: string | null;
  screeningAnswers: ScreeningAnswer[];
  notes: string;
  reminderAt: string;
  onTabChange: (tab: number) => void;
  onCopy: (text: string, label: string) => void;
  onSelectVariant: (variantId: string) => void;
  onRecordVariant: (variantId: string, outcome: 'sent' | 'response') => void;
  onNotesChange: (notes: string) => void;
  onReminderChange: (reminderAt: string) => void;
}

export const WorkspaceTabs = ({
  activeTab,
  preparation,
  coverLetter,
  variants,
  selectedVariantId,
  screeningAnswers,
  notes,
  reminderAt,
  onTabChange,
  onCopy,
  onSelectVariant,
  onRecordVariant,
  onNotesChange,
  onReminderChange,
}: WorkspaceTabsProps) => {
  const { t } = useTranslation();
  return (
    <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
      <Tabs value={activeTab} onChange={(_, value) => onTabChange(value)} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: '1px solid', borderColor: 'divider', mb: 3 }}>
        <Tab label={t('Results')} />
        <Tab label={t('Cover Letter')} />
        <Tab label={t('CV Variants (A/B)')} />
        <Tab label={t('Screening Q&A')} />
        <Tab label={t('Notes & Reminder')} />
      </Tabs>
      {activeTab === 0 && <PreparationResults preparation={preparation} onCopy={onCopy} />}
      {activeTab === 1 && (
        coverLetter ? (
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight={800}>{t('Cover Letter')}</Typography>
              <Button startIcon={<ContentCopyIcon />} onClick={() => onCopy(coverLetter, t('Cover Letter'))}>{t('Copy')}</Button>
            </Stack>
            <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{coverLetter}</Typography>
          </Box>
        ) : <Alert severity="info">{t('No cover letter has been generated yet.')}</Alert>
      )}
      {activeTab === 2 && (
        <CvVariantResults variants={variants} selectedVariantId={selectedVariantId} onSelect={onSelectVariant} onRecord={onRecordVariant} onCopy={onCopy} />
      )}
      {activeTab === 3 && (
        screeningAnswers.length ? (
          <Stack spacing={2}>
            {screeningAnswers.map((answer) => (
              <Paper key={answer.id} elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <Stack direction="row" justifyContent="space-between" gap={2} alignItems="flex-start">
                  <Box>
                    <Typography fontWeight={800}>{answer.question}</Typography>
                    <Typography sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>{answer.answer}</Typography>
                  </Box>
                  <Button size="small" startIcon={<ContentCopyIcon />} onClick={() => onCopy(answer.answer, answer.question)}>{t('Copy')}</Button>
                </Stack>
              </Paper>
            ))}
          </Stack>
        ) : <Alert severity="info">{t('No screening answers have been generated yet.')}</Alert>
      )}
      {activeTab === 4 && (
        <Stack spacing={2}>
          <TextField label={t('Application notes')} multiline minRows={6} value={notes} onChange={(event) => onNotesChange(event.target.value)} />
          <TextField label={t('Follow-up reminder')} type="datetime-local" value={reminderAt} onChange={(event) => onReminderChange(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        </Stack>
      )}
    </Paper>
  );
};
