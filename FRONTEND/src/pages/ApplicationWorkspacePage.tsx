import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Paper,
  Tabs,
  Tab,
  Chip,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Alert,
  Snackbar,
  Select,
  MenuItem,
  Divider,
  IconButton,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ChecklistIcon from '@mui/icons-material/Checklist';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import axios from 'axios';
import { JOB_ENDPOINTS } from '../constants/endpoints';
import { COLORS } from "../theme/tokens";
import CvVariantResults, { type CvVariant } from '../features/JobRadar/components/CvVariantResults';

interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

interface ScreeningQA {
  id: string;
  question: string;
  answer: string;
  source: 'ai' | 'user';
  editable: boolean;
}

const ApplicationWorkspacePage = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savedSnack, setSavedSnack] = useState(false);
  const [copySnack, setCopySnack] = useState<string | null>(null);

  const [workspaceData, setWorkspaceData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState(0);

  // Editable states
  const [status, setStatus] = useState('matched');
  const [notes, setNotes] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [reminderAt, setReminderAt] = useState('');
  const [selectedCvVariant, setSelectedCvVariant] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [screeningAnswers, setScreeningAnswers] = useState<ScreeningQA[]>([]);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchWorkspace = useCallback(async () => {
    if (!matchId) return;
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(
        JOB_ENDPOINTS.workspace(matchId!),
        { withCredentials: true }
      );
      const data = res.data;
      setWorkspaceData(data);
      setStatus(data.match.status || 'matched');
      setNotes(data.match.notes || '');
      setCoverLetter(data.match.coverLetter || '');
      setReminderAt(
        data.match.reminderAt ? new Date(data.match.reminderAt).toISOString().slice(0, 16) : ''
      );
      setSelectedCvVariant(data.match.selectedCvVariant || null);
      setChecklist(data.checklist || []);
      setScreeningAnswers(data.screeningAnswers || []);
    } catch (err: any) {
      setError(err.response?.data?.message || t('Failed to load application workspace.'));
    } finally {
      setLoading(false);
    }
  }, [matchId, t]);

  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);

  // Debounced auto-save helper
  const triggerAutoSave = useCallback(
    (overrides: Record<string, any> = {}) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        try {
          const payload = {
            status,
            notes,
            coverLetter,
            reminderAt: reminderAt || null,
            selectedCvVariant,
            checklist,
            screeningAnswers,
            ...overrides,
          };
          await axios.patch(
            JOB_ENDPOINTS.workspace(matchId!),
            payload,
            { withCredentials: true }
          );
          setSavedSnack(true);
        } catch (e) {
          console.error('Auto-save error', e);
        }
      }, 1000);
    },
    [matchId, status, notes, coverLetter, reminderAt, selectedCvVariant, checklist, screeningAnswers]
  );

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopySnack(`${label} ${t('copied to clipboard!')}`);
  };

  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus);
    triggerAutoSave({ status: newStatus });
  };

  const handleChecklistToggle = (id: string) => {
    const updated = checklist.map((item) =>
      item.id === id ? { ...item, done: !item.done } : item
    );
    setChecklist(updated);
    triggerAutoSave({ checklist: updated });
  };

  const recordVariantOutcome = async (variantId: string, outcome: 'sent' | 'response') => {
    try {
      const response = await axios.patch(
        JOB_ENDPOINTS.variantOutcome(variantId),
        { [outcome]: true },
        { withCredentials: true },
      );
      setWorkspaceData((currentWorkspace: any) => ({
        ...currentWorkspace,
        cvVariants: currentWorkspace.cvVariants.map((variant: CvVariant) =>
          variant.id === variantId ? response.data.variant : variant
        ),
      }));
    } catch {
      setCopySnack(t('Could not update variant outcome.'));
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: COLORS.primary }} />
      </Box>
    );
  }

  if (error || !workspaceData) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || t('Workspace not found.')}
        </Alert>
        <Button startIcon={i18n.language === 'ar' ? <ArrowForwardIcon /> : <ArrowBackIcon />} onClick={() => navigate('/job-radar')}>
          {t('Back to Job Radar')}
        </Button>
      </Container>
    );
  }

  const { match, userProfile, primaryCv } = workspaceData;
  const cvVariants: CvVariant[] = workspaceData.cvVariants || [];

  return (
    <Box sx={{ bgcolor: COLORS.surfaceSubtle, minHeight: '100vh', pb: 10 }}>
      {/* Header Bar */}
      <Paper elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: COLORS.bgWhite, py: 2.5 }}>
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton aria-label={t('Back to Job Radar')} onClick={() => navigate(-1)} size="small">
                {i18n.language === 'ar' ? <ArrowForwardIcon /> : <ArrowBackIcon />}
              </IconButton>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Typography variant="h5" fontWeight={700}>
                    {match.title}
                  </Typography>
                  <Chip
                    label={match.analysisStatus === 'pending' ? t('Analysis required') : `${match.fitScore}% ${t('Fit')}`}
                    color={match.analysisStatus === 'pending' ? 'info' : match.fitScore >= 80 ? 'success' : 'warning'}
                    size="small"
                    sx={{ fontWeight: 700 }}
                  />
                </Box>
                <Typography color="text.secondary" variant="body2">
                  {match.company} {match.location ? `أ¢â‚¬آ¢ ${match.location}` : ''}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<OpenInNewIcon />}
                onClick={() => {
                  const url = match.url;
                  if (url && url !== 'https://linkedin.com' && url.startsWith('http')) {
                    window.open(url, '_blank', 'noopener,noreferrer');
                  } else {
                    window.open('https://www.linkedin.com/jobs/', '_blank', 'noopener,noreferrer');
                  }
                }}
                sx={{ borderRadius: 2 }}
              >
                {t('Open Application')}
              </Button>

              <Select
                size="small"
                value={status}
                onChange={(e) => handleStatusChange(e.target.value)}
                sx={{ borderRadius: 2, minWidth: 140, fontWeight: 600 }}
              >
                <MenuItem value="matched">{t('Matched')}</MenuItem>
                <MenuItem value="applied">{t('Applied')}</MenuItem>
                <MenuItem value="interview">{t('Interview')}</MenuItem>
                <MenuItem value="offer">{t('Offer')}</MenuItem>
                <MenuItem value="rejected">{t('Rejected')}</MenuItem>
              </Select>
            </Box>
          </Box>
        </Container>
      </Paper>

      {/* Main Container */}
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Grid container spacing={3}>
          {/* Left Column: Preparation Tabs */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <Tabs
                value={activeTab}
                onChange={(_, v) => setActiveTab(v)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ borderBottom: '1px solid', borderColor: 'divider', mb: 3 }}
              >
                <Tab label={t('Match Analysis')} />
                <Tab label={t('Cover Letter')} />
                <Tab label={t('CV Variants (A/B)')} />
                <Tab label={t('Screening Q&A')} />
                <Tab label={t('Notes & Reminder')} />
              </Tabs>

              {/* Tab 0: Match Analysis */}
              {activeTab === 0 && (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <ContentCopyIcon color="primary" fontSize="small" />
                  <Typography variant="h6" fontWeight={700}>{t('Quick Copy Chips')}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {t('One-click copy for application forms:')}
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {primaryCv?.text && (
                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      startIcon={<ContentCopyIcon />}
                      onClick={() => copyToClipboard(primaryCv.text, t('Primary CV Text'))}
                      sx={{ justifyContent: 'flex-start' }}
                    >
                      {t('Copy Full CV Text')}
                    </Button>
                  )}

                  {coverLetter && (
                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      startIcon={<ContentCopyIcon />}
                      onClick={() => copyToClipboard(coverLetter, t('Cover Letter'))}
                      sx={{ justifyContent: 'flex-start' }}
                    >
                      {t('Copy Cover Letter')}
                    </Button>
                  )}

                  {userProfile?.salaryExpectation && (
                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      startIcon={<ContentCopyIcon />}
                      onClick={() =>
                        copyToClipboard(
                          `${userProfile.salaryExpectation} ${userProfile.salaryCurrency || 'USD'}`,
                          t('Salary Expectation')
                        )
                      }
                      sx={{ justifyContent: 'flex-start' }}
                    >
                      {t('Salary')}: {userProfile.salaryExpectation} {userProfile.salaryCurrency || 'USD'}
                    </Button>
                  )}

                  {userProfile?.noticePeriod && (
                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      startIcon={<ContentCopyIcon />}
                      onClick={() => copyToClipboard(userProfile.noticePeriod, t('Notice Period'))}
                      sx={{ justifyContent: 'flex-start' }}
                    >
                      {t('Notice Period')}: {userProfile.noticePeriod.replace('_', ' ')}
                    </Button>
                  )}

                  {userProfile?.visaStatus && (
                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      startIcon={<ContentCopyIcon />}
                      onClick={() => copyToClipboard(userProfile.visaStatus, t('Visa Status'))}
                      sx={{ justifyContent: 'flex-start' }}
                    >
                      {t('Visa')}: {userProfile.visaStatus.replace('_', ' ')}
                    </Button>
                  )}

                  {userProfile?.workPreference && (
                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      startIcon={<ContentCopyIcon />}
                      onClick={() => copyToClipboard(userProfile.workPreference, t('Work Preference'))}
                      sx={{ justifyContent: 'flex-start' }}
                    >
                      {t('Preference')}: {userProfile.workPreference}
                    </Button>
                  )}
                </Box>
                </Box>
              )}

              {activeTab === 2 && (
                <CvVariantResults
                  variants={cvVariants}
                  selectedVariantId={selectedCvVariant}
                  onSelect={(variantId) => {
                    setSelectedCvVariant(variantId);
                    triggerAutoSave({ selectedCvVariant: variantId });
                  }}
                  onRecord={recordVariantOutcome}
                  onCopy={copyToClipboard}
                />
              )}

              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <ChecklistIcon color="primary" fontSize="small" />
                  <Typography variant="h6" fontWeight={700}>{t('Application Checklist')}</Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {checklist.map((item) => (
                    <FormControlLabel
                      key={item.id}
                      control={
                        <Checkbox
                          checked={item.done}
                          onChange={() => handleChecklistToggle(item.id)}
                          color="success"
                        />
                      }
                      label={
                        <Typography
                          variant="body2"
                          sx={{ textDecoration: item.done ? 'line-through' : 'none', color: item.done ? 'text.secondary' : 'text.primary' }}
                        >
                          {t(item.label)}
                        </Typography>
                      }
                    />
                  ))}
                </Box>
              </Paper>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* Toast Notifications */}
      <Snackbar
        open={savedSnack}
        autoHideDuration={2500}
        onClose={() => setSavedSnack(false)}
        message={t('Changes saved successfully')}
      />

      <Snackbar
        open={Boolean(copySnack)}
        autoHideDuration={2500}
        onClose={() => setCopySnack(null)}
        message={copySnack || ''}
      />
    </Box>
  );
};

export default ApplicationWorkspacePage;
