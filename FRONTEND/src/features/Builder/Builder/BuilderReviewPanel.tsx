import { useCallback, useState } from 'react';
import { Alert, Box, Button, CircularProgress, LinearProgress, Typography } from '@mui/material';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { BarChart3, CheckCircle2, RefreshCw, ShieldAlert, Wand2 } from '../../../components/icons/MuiIcons';
import { useAuth } from '../../../hooks/useAuth';
import { useFeedback } from '../../../context/FeedbackContext';
import { cvAnalyzeAction, requestLanguage } from '../../../redux/store/slices/cvAnalyzeSlice';
import type { BuilderFormData, CvSection } from '../../../redux/store/slices/cvBuilderSlice';
import type { RootState } from '../../../redux/store/store';
import type { CVAnalysisResult } from '../../CVAnalysis/CVAnalysisDashboard/CVAnalysisDashboard.types';
import { AI_ENDPOINTS } from '../../../constants/endpoints';
import { track } from '../../../lib/analytics';
import { hasPaidAccess } from '../../../utils/proAccess';
import reviewPanel from './builderReviewPanel.tokens';
import { mergeBuilderImprovements } from './mergeBuilderImprovements';

interface BuilderReviewPanelProps {
  formData: BuilderFormData;
  sectionOrder: CvSection[];
  template: string;
  fontScale: number;
  onApply: (formData: BuilderFormData) => void;
}

interface ImprovementProposal {
  formData: BuilderFormData;
  changes: { section: string; what: string; why: string; before: string; after: string }[];
}

const BuilderReviewPanel = ({ formData, sectionOrder, template, fontScale, onApply }: BuilderReviewPanelProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch<any>();
  const { user } = useAuth();
  const { showEntitlement } = useFeedback();
  const analysisState = useSelector((state: RootState) => state.cvAnalyze);
  const [started, setStarted] = useState(false);
  const [fixLoading, setFixLoading] = useState(false);
  const [fixError, setFixError] = useState('');
  const [proposal, setProposal] = useState<ImprovementProposal | null>(null);
  const [applied, setApplied] = useState(false);
  const analysis = analysisState.cvAnalyze as CVAnalysisResult | null;

  const analyze = useCallback(async () => {
    setStarted(true);
    setProposal(null);
    setApplied(false);
    setFixError('');
    const action = await dispatch(cvAnalyzeAction({
      builderCv: { formData, sectionOrder, template, fontScale },
      language: requestLanguage(),
    }));
    if (cvAnalyzeAction.fulfilled.match(action)) track('builder_analysis_run');
  }, [dispatch, fontScale, formData, sectionOrder, template]);

  const generateFixes = async () => {
    if (!analysis) return;
    if (!hasPaidAccess(user)) {
      showEntitlement('PRO_REQUIRED');
      return;
    }

    setFixLoading(true);
    setFixError('');
    setProposal(null);
    try {
      const response = await axios.post(
        AI_ENDPOINTS.improveBuilderCV,
        {
          formData,
          dimensions: analysis.dimensions,
        },
        { withCredentials: true },
      );
      const improvement = response.data as ImprovementProposal;
      setProposal({
        ...improvement,
        formData: mergeBuilderImprovements(formData, improvement.formData),
      });
    } catch (error) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined;
      setFixError(message || t('We could not prepare safe fixes. Please try again.'));
    } finally {
      setFixLoading(false);
    }
  };

  const applyFixes = () => {
    if (!proposal) return;
    onApply(proposal.formData);
    setApplied(true);
    track('builder_ai_fixes_applied', { changes: proposal.changes.length });
  };

  if (!started) {
    return (
      <Box sx={reviewPanel.root}>
        <Box sx={reviewPanel.eyebrow}><BarChart3 size={17} /> {t('Final quality check')}</Box>
        <Typography sx={reviewPanel.title}>{t('Analyze before you download')}</Typography>
        <Typography sx={reviewPanel.body}>
          {t('Review this CV directly in the builder, see evidence-based improvements, and approve safe wording fixes without uploading it again.')}
        </Typography>
        <Box sx={reviewPanel.guardrail}>
          <CheckCircle2 size={18} />
          <Typography>{t('AI may improve wording, but it cannot add facts, percentages, dates, or numbers that you did not provide.')}</Typography>
        </Box>
        <Button variant="contained" startIcon={<BarChart3 size={18} />} onClick={() => void analyze()} sx={reviewPanel.primaryButton}>
          {t('Analyze this CV')}
        </Button>
      </Box>
    );
  }

  if (analysisState.loading) {
    return (
      <Box sx={reviewPanel.loading}>
        <CircularProgress size={38} />
        <Typography sx={reviewPanel.title}>{t('Analyzing your CV...')}</Typography>
        <Typography sx={reviewPanel.body}>{t('Checking structure, clarity, evidence, and ATS readability.')}</Typography>
      </Box>
    );
  }

  if (analysisState.error || !analysis) {
    return (
      <Box sx={reviewPanel.root}>
        <Alert severity="error">{analysisState.error || t('The analysis could not be completed.')}</Alert>
        <Button startIcon={<RefreshCw size={17} />} onClick={() => void analyze()} sx={reviewPanel.retryButton}>
          {t('Try analysis again')}
        </Button>
      </Box>
    );
  }

  if (applied) {
    return (
      <Box sx={reviewPanel.root}>
        <Box sx={reviewPanel.eyebrow}><CheckCircle2 size={17} /> {t('Final quality check')}</Box>
        <Typography sx={reviewPanel.title}>{t('Final safe fixes applied')}</Typography>
        <Typography sx={reviewPanel.body}>
          {t('The approved fixes came from this analysis and were applied once. No new analysis was started, so the completed findings will not be replaced by a different list.')}
        </Typography>
        <Box sx={reviewPanel.guardrail}>
          <CheckCircle2 size={18} />
          <Typography>{t('You can use Undo in the builder if you want to restore the previous version.')}</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={reviewPanel.root}>
      <Box sx={reviewPanel.scoreHeader}>
        <Box>
          <Box sx={reviewPanel.eyebrow}><BarChart3 size={17} /> {t('CV quality')}</Box>
          <Typography sx={reviewPanel.score}>{analysis.qualityScore}</Typography>
        </Box>
        <Button startIcon={<RefreshCw size={16} />} onClick={() => void analyze()} sx={reviewPanel.textButton}>
          {t('Analyze again')}
        </Button>
      </Box>
      <LinearProgress variant="determinate" value={analysis.qualityScore} sx={reviewPanel.progress} />

      <Typography sx={reviewPanel.sectionTitle}>{t('Score Breakdown')}</Typography>
      <Box sx={reviewPanel.findings}>
        {analysis.dimensions.length === 0 ? (
          <Box sx={reviewPanel.emptyFinding}><CheckCircle2 size={18} /> {t('No actionable issues were found.')}</Box>
        ) : [...analysis.dimensions].sort((left, right) => left.score - right.score).map((dimension) => (
          <Box key={dimension.name} sx={reviewPanel.finding}>
            <Box sx={reviewPanel.findingTitle}>
              <ShieldAlert size={16} />
              {t(dimension.name)}
              <Typography component="span" sx={reviewPanel.dimensionScore}>{dimension.score}</Typography>
            </Box>
            {dimension.details.map((detail) => (
              <Typography key={detail} sx={reviewPanel.findingSuggestion}>{detail}</Typography>
            ))}
          </Box>
        ))}
      </Box>

      <Box sx={reviewPanel.guardrail}>
        <CheckCircle2 size={18} />
        <Typography>{t('Safe fixes preserve your identity, employers, dates, skills, links, education, custom sections, and every number you supplied.')}</Typography>
      </Box>

      {fixError && <Alert severity="error">{fixError}</Alert>}

      {proposal && proposal.changes.length === 0 && (
        <Alert severity="info">{t('No safe wording changes were available for these findings. Add any missing factual evidence manually.')}</Alert>
      )}

      {proposal && proposal.changes.length > 0 && (
        <Box sx={reviewPanel.changeList}>
          <Typography sx={reviewPanel.sectionTitle}>{t('Proposed changes')}</Typography>
          {proposal.changes.map((change, index) => (
            <Box key={`${change.section}-${index}`} sx={reviewPanel.change}>
              <Typography sx={reviewPanel.changeTitle}>{change.section}</Typography>
              <Typography sx={reviewPanel.changeText}>{change.what}</Typography>
              <Typography sx={reviewPanel.changeText}><strong>{t('Before')}:</strong> {change.before}</Typography>
              <Typography sx={reviewPanel.changeText}><strong>{t('After')}:</strong> {change.after}</Typography>
              <Typography sx={reviewPanel.rationale}>{change.why}</Typography>
            </Box>
          ))}
        </Box>
      )}

      {proposal && proposal.changes.length > 0 ? (
        <Button variant="contained" startIcon={<CheckCircle2 size={18} />} onClick={applyFixes} sx={reviewPanel.primaryButton}>
          {t('Apply final safe fixes')}
        </Button>
      ) : !proposal ? (
        <Button
          variant="contained"
          startIcon={fixLoading ? <CircularProgress size={17} color="inherit" /> : <Wand2 size={18} />}
          onClick={() => void generateFixes()}
          disabled={fixLoading || analysis.dimensions.length === 0}
          sx={reviewPanel.primaryButton}
        >
          {fixLoading ? t('Preparing fixes...') : t('Generate safe fixes')}
        </Button>
      ) : null}
    </Box>
  );
};

export default BuilderReviewPanel;
