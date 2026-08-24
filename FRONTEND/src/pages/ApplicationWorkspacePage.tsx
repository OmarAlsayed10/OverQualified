import { useCallback, useEffect, useRef, useState } from 'react';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Alert, Box, Button, CircularProgress, Container, Grid, Snackbar } from '@mui/material';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { WorkspaceHeader } from '../features/JobRadar/ApplicationWorkspace/WorkspaceHeader';
import { WorkspaceTabs } from '../features/JobRadar/ApplicationWorkspace/WorkspaceTabs';
import type {
  ApplicationWorkspaceData,
  ChecklistItem,
  ScreeningAnswer,
} from '../features/JobRadar/ApplicationWorkspace/applicationWorkspace.types';
import type { CvVariant } from '../features/JobRadar/components/CvVariantResults';
import { JOB_ENDPOINTS } from '../constants/endpoints';
import i18n from '../i18n';
import { COLORS } from '../theme/tokens';

const ApplicationWorkspacePage = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savedSnack, setSavedSnack] = useState(false);
  const [copySnack, setCopySnack] = useState<string | null>(null);
  const [workspaceData, setWorkspaceData] = useState<ApplicationWorkspaceData | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [status, setStatus] = useState('matched');
  const [notes, setNotes] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [reminderAt, setReminderAt] = useState('');
  const [selectedCvVariant, setSelectedCvVariant] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [screeningAnswers, setScreeningAnswers] = useState<ScreeningAnswer[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchWorkspace = useCallback(async () => {
    if (!matchId) return;
    setLoading(true);
    setError('');
    try {
      const response = await axios.get<ApplicationWorkspaceData>(JOB_ENDPOINTS.workspace(matchId), { withCredentials: true });
      const workspace = response.data;
      setWorkspaceData(workspace);
      setStatus(workspace.match.status || 'matched');
      setNotes(workspace.match.notes || '');
      setCoverLetter(workspace.match.coverLetter || '');
      setReminderAt(workspace.match.reminderAt ? new Date(workspace.match.reminderAt).toISOString().slice(0, 16) : '');
      setSelectedCvVariant(workspace.match.selectedCvVariant || null);
      setChecklist(workspace.checklist || []);
      setScreeningAnswers(workspace.screeningAnswers || []);
    } catch (requestError: any) {
      setError(requestError.response?.data?.message || t('Failed to load application workspace.'));
    } finally {
      setLoading(false);
    }
  }, [matchId, t]);

  useEffect(() => {
    void fetchWorkspace();
  }, [fetchWorkspace]);

  const triggerAutoSave = useCallback((overrides: Record<string, any> = {}) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await axios.patch(
          JOB_ENDPOINTS.workspace(matchId!),
          {
            status,
            notes,
            coverLetter,
            reminderAt: reminderAt || null,
            selectedCvVariant,
            checklist,
            screeningAnswers,
            ...overrides,
          },
          { withCredentials: true },
        );
        setSavedSnack(true);
      } catch (saveError) {
        console.error('Auto-save error', saveError);
      }
    }, 1000);
  }, [matchId, status, notes, coverLetter, reminderAt, selectedCvVariant, checklist, screeningAnswers]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopySnack(`${label} ${t('copied to clipboard!')}`);
  };

  const handleStatusChange = async (nextStatus: string) => {
    setStatus(nextStatus);
    triggerAutoSave({ status: nextStatus });
  };

  const handleChecklistToggle = (id: string) => {
    const updatedChecklist = checklist.map((item) => item.id === id ? { ...item, done: !item.done } : item);
    setChecklist(updatedChecklist);
    triggerAutoSave({ checklist: updatedChecklist });
  };

  const recordVariantOutcome = async (variantId: string, outcome: 'sent' | 'response') => {
    try {
      const response = await axios.patch(
        JOB_ENDPOINTS.variantOutcome(variantId),
        { [outcome]: true },
        { withCredentials: true },
      );
      setWorkspaceData((currentWorkspace) => ({
        ...currentWorkspace!,
        cvVariants: currentWorkspace!.cvVariants.map((variant: CvVariant) => (
          variant.id === variantId ? response.data.variant : variant
        )),
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
        <Alert severity="error" sx={{ mb: 3 }}>{error || t('Workspace not found.')}</Alert>
        <Button startIcon={i18n.language === 'ar' ? <ArrowForwardIcon /> : <ArrowBackIcon />} onClick={() => navigate('/job-radar')}>
          {t('Back to Job Radar')}
        </Button>
      </Container>
    );
  }

  const { match, userProfile, primaryCv } = workspaceData;
  const cvVariants = workspaceData.cvVariants || [];
  return (
    <Box sx={{ bgcolor: COLORS.surfaceSubtle, minHeight: '100vh', pb: 10 }}>
      <WorkspaceHeader
        match={match}
        status={status}
        onBack={() => navigate(-1)}
        onPractice={() => navigate(`/interview-coach?jobId=${encodeURIComponent(matchId!)}`)}
        onStatusChange={(nextStatus) => void handleStatusChange(nextStatus)}
      />
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <WorkspaceTabs
              activeTab={activeTab}
              cvText={primaryCv?.text}
              coverLetter={coverLetter}
              userProfile={userProfile}
              variants={cvVariants}
              selectedVariantId={selectedCvVariant}
              checklist={checklist}
              onTabChange={setActiveTab}
              onCopy={copyToClipboard}
              onSelectVariant={(variantId) => {
                setSelectedCvVariant(variantId);
                triggerAutoSave({ selectedCvVariant: variantId });
              }}
              onRecordVariant={(variantId, outcome) => void recordVariantOutcome(variantId, outcome)}
              onToggleChecklist={handleChecklistToggle}
            />
          </Grid>
        </Grid>
      </Container>
      <Snackbar open={savedSnack} autoHideDuration={2500} onClose={() => setSavedSnack(false)} message={t('Changes saved successfully')} />
      <Snackbar open={Boolean(copySnack)} autoHideDuration={2500} onClose={() => setCopySnack(null)} message={copySnack || ''} />
    </Box>
  );
};

export default ApplicationWorkspacePage;
