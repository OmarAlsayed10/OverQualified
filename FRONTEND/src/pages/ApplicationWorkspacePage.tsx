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
  ApplicationPreparation,
  ScreeningAnswer,
} from '../features/JobRadar/ApplicationWorkspace/applicationWorkspace.types';
import type { CvVariant } from '../features/JobRadar/components/CvVariantResults';
import { AI_ENDPOINTS, JOB_ENDPOINTS } from '../constants/endpoints';
import i18n from '../i18n';
import { COLORS } from '../theme/tokens';
import { PreparationProgress } from '../features/JobRadar/ApplicationWorkspace/PreparationProgress';
import { emptyPreparation, prepareApplication } from '../features/JobRadar/ApplicationWorkspace/applicationPreparation';
import { ApplicationCvSelector } from '../features/JobRadar/ApplicationWorkspace/ApplicationCvSelector';
import type { CvOption } from '../utils/cvOptions';

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
  const [screeningAnswers, setScreeningAnswers] = useState<ScreeningAnswer[]>([]);
  const [preparation, setPreparation] = useState<ApplicationPreparation>(emptyPreparation());
  const [savedCv, setSavedCv] = useState<CvOption | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedCvName, setUploadedCvName] = useState<string | null>(null);
  const [uploadedCvText, setUploadedCvText] = useState('');
  const [parsingCv, setParsingCv] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const workspaceMetadata = useRef<Record<string, unknown>>({});

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
      setScreeningAnswers(workspace.screeningAnswers || []);
      workspaceMetadata.current = workspace.match.workspaceData ?? {};
      const storedPreparation = workspace.match.workspaceData?.preparation ?? emptyPreparation();
      setPreparation(storedPreparation);
      if (storedPreparation.cvSource?.type === 'saved' && storedPreparation.cvSource.id) {
        setSavedCv({ id: storedPreparation.cvSource.id, title: storedPreparation.cvSource.name, text: storedPreparation.cvSource.text, isPrimary: storedPreparation.cvSource.id === workspace.primaryCv?.id, roleSuggestions: [] });
      } else if (storedPreparation.cvSource?.type === 'upload') {
        setUploadedCvName(storedPreparation.cvSource.name);
        setUploadedCvText(storedPreparation.cvSource.text);
      }
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
  }, [matchId, status, notes, coverLetter, reminderAt, selectedCvVariant, screeningAnswers]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopySnack(`${label} ${t('copied to clipboard!')}`);
  };

  const handleStatusChange = async (nextStatus: string) => {
    setStatus(nextStatus);
    triggerAutoSave({ status: nextStatus });
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

  const selectSavedCv = (cv: CvOption) => {
    setSavedCv(cv);
    setUploadedFile(null);
    setUploadedCvName(null);
    setUploadedCvText('');
    setPreparation(emptyPreparation());
  };

  const selectUploadedCv = async (file: File) => {
    setParsingCv(true);
    try {
      const form = new FormData();
      form.append('cv', file);
      const response = await axios.post(AI_ENDPOINTS.importCv, form, { withCredentials: true });
      const cvText = typeof response.data.cvText === 'string' ? response.data.cvText : '';
      if (cvText.trim().length < 100) throw new Error('Unreadable CV');
      setUploadedFile(file);
      setUploadedCvName(file.name);
      setUploadedCvText(cvText);
      setSavedCv(null);
      setPreparation(emptyPreparation());
    } catch {
      setCopySnack(t('Could not read this CV. Try another PDF or DOCX.'));
    } finally {
      setParsingCv(false);
    }
  };

  const persistPreparation = useCallback(async (nextPreparation: ApplicationPreparation) => {
    if (!matchId) return;
    const nextWorkspaceData = { ...workspaceMetadata.current, preparation: nextPreparation };
    workspaceMetadata.current = nextWorkspaceData;
    await axios.patch(JOB_ENDPOINTS.workspace(matchId), { workspaceData: nextWorkspaceData }, { withCredentials: true });
  }, [matchId]);

  const runPreparation = useCallback(async (restart = false) => {
    const cvText = savedCv?.text || uploadedCvText;
    const cvName = savedCv?.title || uploadedCvName;
    if (!matchId || !workspaceData || !cvText || !cvName) return;
    try {
      await prepareApplication({
        matchId,
        cvId: savedCv?.id,
        cvFile: uploadedFile ?? undefined,
        cvName,
        cvText,
        jobTitle: workspaceData.match.title,
        jobDescription: workspaceData.job.description,
        language: i18n.language.startsWith('ar') ? 'ar' : 'en',
        current: preparation,
        restart,
        persist: persistPreparation,
        onChange: setPreparation,
        onCoverLetter: setCoverLetter,
        onVariants: (variants) => {
          setWorkspaceData((current) => current ? { ...current, cvVariants: variants } : current);
          setSelectedCvVariant(null);
        },
        onScreeningAnswers: setScreeningAnswers,
      });
    } catch {
      setCopySnack(t('Could not save application preparation progress.'));
    } finally {
      window.dispatchEvent(new Event('quota:refresh'));
    }
  }, [matchId, persistPreparation, preparation, savedCv, t, uploadedCvName, uploadedCvText, uploadedFile, workspaceData]);

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

  const { match } = workspaceData;
  const cvVariants = workspaceData.cvVariants || [];
  const cvSelected = Boolean(savedCv || uploadedCvText);
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
        <ApplicationCvSelector
          savedCv={savedCv}
          uploadedName={uploadedCvName}
          parsing={parsingCv}
          disabled={preparation.status === 'running'}
          onSavedCv={selectSavedCv}
          onUpload={(file) => void selectUploadedCv(file)}
        />
        <PreparationProgress
          preparation={preparation}
          disabled={!cvSelected || parsingCv}
          onPrepare={() => void runPreparation(preparation.status === 'completed' || preparation.status === 'completed_with_errors')}
        />
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <WorkspaceTabs
              activeTab={activeTab}
              preparation={preparation}
              coverLetter={coverLetter}
              variants={cvVariants}
              selectedVariantId={selectedCvVariant}
              screeningAnswers={screeningAnswers}
              notes={notes}
              reminderAt={reminderAt}
              onTabChange={setActiveTab}
              onCopy={copyToClipboard}
              onSelectVariant={(variantId) => {
                setSelectedCvVariant(variantId);
                triggerAutoSave({ selectedCvVariant: variantId });
              }}
              onRecordVariant={(variantId, outcome) => void recordVariantOutcome(variantId, outcome)}
              onNotesChange={(nextNotes) => {
                setNotes(nextNotes);
                triggerAutoSave({ notes: nextNotes });
              }}
              onReminderChange={(nextReminder) => {
                setReminderAt(nextReminder);
                triggerAutoSave({ reminderAt: nextReminder || null });
              }}
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
