import { useEffect, useRef, useState } from 'react';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import EditNoteIcon from '@mui/icons-material/EditNote';
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogContent, DialogTitle,
  IconButton, Tab, Tabs, Tooltip, Typography,
} from '@mui/material';
import { pdf } from '@react-pdf/renderer';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AI_ENDPOINTS, CV_ENDPOINTS } from '../../../../../constants/endpoints';
import { useTemplate } from '../../../../../hooks/useTemplate';
import { updateFormData } from '../../../../../redux/store/slices/cvBuilderSlice';
import type { CVChange, ScoreCategory } from '../../../../../redux/store/slices/cvAdjustSlice';
import PdfPlainCV from '../../../../../templates/pdf/PdfPlainCV';
import { COLORS } from '../../../../../theme/tokens';
import { preferredSectionOrder } from '../../../../Builder/cvChecks';
import { ChangesList } from './ChangesList';
import { LOADING_STEPS, TEMPLATE_SECTIONS } from './config';
import { LoadingState } from './LoadingState';
import { OptimizedCVView } from './OptimizedCVView';

interface CVOptimizeModalProps {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  error: string | null;
  adjustedCV: string | null;
  optimizedFormData?: Record<string, any> | null;
  changes: CVChange[];
  newScore: number | null;
  newBreakdown: ScoreCategory[];
  originalScore: number;
  pageCount: number;
}

const CVOptimizeModal = ({
  open, onClose, loading, error, adjustedCV, optimizedFormData, changes, newScore, newBreakdown, originalScore,
}: CVOptimizeModalProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [tab, setTab] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [openingBuilder, setOpeningBuilder] = useState(false);
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const { choosenTemp } = useTemplate();
  const formDataCache = useRef<any>(null);

  const ensureFormData = async () => {
    if (formDataCache.current) return formDataCache.current;
    if (optimizedFormData) {
      formDataCache.current = optimizedFormData;
      return optimizedFormData;
    }
    const res = await axios.post(AI_ENDPOINTS.parseCv, { cvText: adjustedCV }, { withCredentials: true });
    formDataCache.current = res.data.formData;
    return res.data.formData;
  };

  const handleEditInBuilder = async () => {
    if (!adjustedCV) return;
    setOpeningBuilder(true);
    try {
      const formData = await ensureFormData();
      dispatch(updateFormData(formData));
      navigate('/builder');
    } catch {
    } finally {
      setOpeningBuilder(false);
    }
  };

  useEffect(() => {
    if (loading) {
      formDataCache.current = null;
      setStepIndex(0);
      stepTimer.current = setInterval(() => {
        setStepIndex((prev) => Math.min(prev + 1, LOADING_STEPS.length - 1));
      }, 2200);
    } else {
      if (stepTimer.current) clearInterval(stepTimer.current);
      if (adjustedCV) setStepIndex(LOADING_STEPS.length);
    }
    return () => { if (stepTimer.current) clearInterval(stepTimer.current); };
  }, [loading, adjustedCV]);

  const saveBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownload = async () => {
    if (!adjustedCV) return;
    setDownloading(true);
    try {
      const firstLine = adjustedCV.split('\n').map((l) => l.trim()).find(Boolean) || 'optimized';
      const fileName = `${firstLine.replace(/\s+/g, '_').slice(0, 40)}_CV.pdf`;

      if (optimizedFormData) {
        const response = await axios.post(
          CV_ENDPOINTS.exportPdf,
          {
            formData: optimizedFormData,
            sectionOrder: preferredSectionOrder(TEMPLATE_SECTIONS),
            template: choosenTemp,
            name: firstLine,
          },
          { withCredentials: true, responseType: 'blob' },
        );
        saveBlob(response.data, fileName);
        return;
      }

      const blob = await pdf(<PdfPlainCV cvText={adjustedCV} />).toBlob();
      saveBlob(blob, fileName);
    } catch {
      const blob = new Blob([adjustedCV], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'optimized-cv.txt';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  const isDone = !loading && !!adjustedCV;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{ sx: { borderRadius: '24px', maxHeight: '90vh', background: COLORS.bgWhite } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, borderBottom: `1px solid ${COLORS.borderLight}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AutoFixHighIcon sx={{ color: COLORS.primary }} />
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: COLORS.textPrimary }}>
            {t('AI CV Optimizer')}
          </Typography>
          {isDone && (
            <Chip label={t('Complete')} size="small" sx={{ bgcolor: COLORS.primaryAlpha12, color: COLORS.primary, fontWeight: 600 }} />
          )}
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ '&:hover': { bgcolor: COLORS.bgHover } }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {loading && <LoadingState stepIndex={stepIndex} />}

        {error && (
          <Box sx={{ p: 4 }}>
            <Typography color="error">{error}</Typography>
          </Box>
        )}

        {isDone && (
          <>
            <Box sx={{ borderBottom: `1px solid ${COLORS.borderLight}`, px: 3 }}>
              <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                sx={{
                  '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', fontSize: '0.95rem' },
                  '& .Mui-selected': { color: COLORS.primary },
                  '& .MuiTabs-indicator': { bgcolor: COLORS.primarySurface },
                }}
              >
                <Tab label={t('Score & Changes')} />
                <Tab label={t('Optimized CV')} />
              </Tabs>
            </Box>

            <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
              {tab === 0 && (
                <ChangesList
                  changes={changes}
                  originalScore={originalScore}
                  newScore={newScore ?? originalScore}
                  newBreakdown={newBreakdown}
                />
              )}
              {tab === 1 && adjustedCV && <OptimizedCVView cvText={adjustedCV} />}
            </Box>

            <Box sx={{ p: 2.5, borderTop: `1px solid ${COLORS.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Typography sx={{ color: COLORS.textSecondary, fontSize: '0.85rem' }}>
                {t('Download your optimized CV — ready to submit to employers.')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                startIcon={openingBuilder ? <CircularProgress size={16} sx={{ color: COLORS.primary }} /> : <EditNoteIcon />}
                onClick={handleEditInBuilder}
                disabled={openingBuilder}
                sx={{ color: COLORS.primary, borderColor: COLORS.primary, borderRadius: '12px', textTransform: 'none', fontWeight: 'bold', px: 3, '&:hover': { borderColor: COLORS.primaryDark, bgcolor: COLORS.primaryAlpha12 } }}
              >
                {openingBuilder ? t('Opening...') : t('Edit in Builder')}
              </Button>
              <Tooltip title={t('Downloads as PDF')}>
                <Button
                  variant="contained"
                  startIcon={downloading ? <CircularProgress size={16} sx={{ color: COLORS.onAccent }} /> : <DownloadIcon />}
                  onClick={handleDownload}
                  disabled={downloading}
                  sx={{ bgcolor: COLORS.primarySurface, borderRadius: '12px', textTransform: 'none', fontWeight: 'bold', px: 3, '&:hover': { bgcolor: COLORS.primarySurfaceDark } }}
                >
                  {downloading ? t('Downloading...') : t('Download Optimized CV')}
                </Button>
              </Tooltip>
              </Box>
            </Box>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CVOptimizeModal;
