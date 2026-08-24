import { Box, Button, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Download, Save } from '../../../components/icons/MuiIcons';
import type { BuilderFormData, CvSection } from '../../../redux/store/slices/cvBuilderSlice';
import { LivePreviewPane } from '../components/LivePreviewPane';
import BuilderReviewPanel from './BuilderReviewPanel';
import builder from './builder.tokens';

interface BuilderDoneViewProps {
  formData: BuilderFormData;
  sectionOrder: CvSection[];
  template: string;
  fontScale: number;
  saving: boolean;
  downloading: boolean;
  onBack: () => void;
  onSave: () => void;
  onDownload: () => void;
  onApply: (formData: BuilderFormData) => void;
}

export const BuilderDoneView = ({
  formData,
  sectionOrder,
  template,
  fontScale,
  saving,
  downloading,
  onBack,
  onSave,
  onDownload,
  onApply,
}: BuilderDoneViewProps) => {
  const { t } = useTranslation();
  return (
    <>
      <Box sx={builder.donePreview}>
        <Box sx={builder.donePreviewDocument}><LivePreviewPane /></Box>
        <Box sx={builder.doneReviewRail}>
          <BuilderReviewPanel
            formData={formData}
            sectionOrder={sectionOrder}
            template={template}
            fontScale={fontScale}
            onApply={onApply}
          />
        </Box>
      </Box>
      <Box sx={builder.doneBar}>
        <Button startIcon={<ArrowLeft size={18} />} onClick={onBack} sx={builder.ghostButton}>{t('Back')}</Button>
        <Button
          variant="outlined"
          startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Save size={18} />}
          onClick={onSave}
          disabled={saving}
          sx={builder.secondaryButton}
        >
          {saving ? t('Saving...') : t('Save to Profile')}
        </Button>
        <Button
          variant="contained"
          startIcon={downloading ? <CircularProgress size={18} color="inherit" /> : <Download size={18} />}
          onClick={onDownload}
          disabled={downloading}
          sx={builder.primaryButton}
        >
          {downloading ? t('Generating...') : t('Download')}
        </Button>
      </Box>
    </>
  );
};
