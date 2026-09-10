import UploadFileIcon from '@mui/icons-material/UploadFile';
import { Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import CvPicker from '../../../components/ui/CvPicker';
import type { CvOption } from '../../../utils/cvOptions';
import { COLORS } from '../../../theme/tokens';

interface ApplicationCvSelectorProps {
  savedCv: CvOption | null;
  uploadedName: string | null;
  parsing: boolean;
  disabled: boolean;
  onSavedCv: (cv: CvOption) => void;
  onUpload: (file: File) => void;
}

export const ApplicationCvSelector = ({ savedCv, uploadedName, parsing, disabled, onSavedCv, onUpload }: ApplicationCvSelectorProps) => {
  const { t } = useTranslation();
  const fileInput = useRef<HTMLInputElement>(null);
  const selectedName = uploadedName || savedCv?.title;

  return (
    <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3 }, mb: 3, borderRadius: 3, border: `1px solid ${COLORS.borderLight}` }}>
      <Typography variant="h6" fontWeight={800}>{t('Choose the CV for this application')}</Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>{t('Upload a CV or choose one from your saved CVs before preparation starts.')}</Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} gap={2} alignItems={{ md: 'flex-start' }}>
        <Box sx={{ flex: 1, width: '100%' }}>
          <CvPicker value={savedCv?.id ?? ''} onSelect={onSavedCv} disabled={disabled || parsing} />
        </Box>
        <Button
          variant="outlined"
          disabled={disabled || parsing}
          startIcon={parsing ? <CircularProgress size={16} /> : <UploadFileIcon />}
          onClick={() => fileInput.current?.click()}
          sx={{ minHeight: 56, whiteSpace: 'nowrap' }}
        >
          {t(parsing ? 'Reading CV...' : 'Upload PDF or DOCX')}
        </Button>
        <input ref={fileInput} hidden type="file" accept=".pdf,.doc,.docx" onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onUpload(file);
          event.target.value = '';
        }} />
      </Stack>
      {selectedName && <Typography sx={{ mt: 1.5, color: COLORS.primary, fontWeight: 700 }}>{t('Selected')}: {selectedName}</Typography>}
    </Paper>
  );
};
