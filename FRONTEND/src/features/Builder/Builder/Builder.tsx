import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, IconButton, ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import { Home } from "../../../components/icons/MuiIcons";
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { AI_ENDPOINTS, CV_ENDPOINTS } from '../../../constants/endpoints';
import { track } from '../../../lib/analytics';
import { addCustomSection, customSectionId, setCurrentCvId, setCvTitle, setFontScale, setPageCount, setSectionOrder, updateFormData, updateSection } from '../../../redux/store/slices/cvBuilderSlice';
import { builderSnapshotFrom, clearBuilderHistory, reapplyBuilderSnapshot, recordBuilderSnapshot, restoreBuilderSnapshot } from '../../../redux/store/slices/builderHistoryActions';
import type { RootState } from '../../../redux/store/store';
import { cvFormToPdfProps } from '../../../templates/pdf/cvFormToPdfProps';
import { useTemplate } from '../../../hooks/useTemplate';
import { FormWorkspace } from '../components/FormWorkspace';
import { LivePreviewPane } from '../components/LivePreviewPane';
import ConversationalBuilder from '../components/ConversationalBuilder/ConversationalBuilder';
import ChooseTemplate from '../sidebar/components/ChooseTemplate';
import AddSectionDialog from '../components/AddSectionDialog/AddSectionDialog';
import { useSkillAutoExtract } from '../hooks/useSkillAutoExtract';
import { mergeSkillCategories, mergeSkillsIntoCategories } from '../skillCategories';
import { detectDateStyles, hasWeakBullets, MIN_READABLE_FONT_SCALE, preferredSectionOrder, runCvChecks, spellOutCvDates } from '../cvChecks';
import type { CvCheck } from '../cvChecks';
import { BuilderDock } from './BuilderDock';
import { BuilderDoneView } from './BuilderDoneView';
import { BuilderNavigation } from './BuilderNavigation';
import { CvSuggestionsPopover } from './CvSuggestionsPopover';
import builder from './builder.tokens';

const sectionLabels = {
  personal: 'Personal',
  projects: 'Projects',
  experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
  languages: 'Languages',
  certifications: 'Certifications',
} as const;

const Builder = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [done, setDone] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [mobileView, setMobileView] = useState<'form' | 'preview'>('form');
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [checksAnchor, setChecksAnchor] = useState<HTMLElement | null>(null);
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [applyingCheckId, setApplyingCheckId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dispatch = useDispatch();
  const builderState = useSelector((state: RootState) => state.cvBuilder);
  const { formData, sectionOrder, currentCvId, title, fontScale, pageCount } = builderState;
  const builderSnapshots = useSelector((state: RootState) => state.builderHistory.snapshots);
  const redoSnapshots = useSelector((state: RootState) => state.builderHistory.redoSnapshots);
  const { choosenTemp } = useTemplate();
  const { t } = useTranslation();
  const steps = sectionOrder.map((section) => {
    const customId = customSectionId(section);
    if (!customId) return sectionLabels[section as keyof typeof sectionLabels];
    const custom = formData.customSections.find((entry) => entry.id === customId);
    return custom?.title || t('New Section');
  });
  const navigate = useNavigate();
  const location = useLocation();
  const analyzedFile = (location.state as { analyzedFile?: File } | null)?.analyzedFile;
  const importedAnalysisFileRef = useRef<File | null>(null);
  const [workspaceKey, setWorkspaceKey] = useState(0);
  useSkillAutoExtract();

  const flashNotice = (type: 'success' | 'error' | 'info', text: string) => {
    setNotice({ type, text });
    window.setTimeout(() => setNotice(null), 3000);
  };

  const importCV = useCallback(async (file?: File) => {
    if (!file) return;
    setImporting(true);
    const upload = new FormData();
    upload.append('cv', file);
    try {
      const response = await axios.post(AI_ENDPOINTS.importCv, upload, { withCredentials: true });
      dispatch(updateFormData(response.data.formData));
      dispatch(clearBuilderHistory());
      setWorkspaceKey((k) => k + 1);
      setChatOpen(true);
    } catch (error) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined;
      flashNotice('error', message || t('We could not import that CV. Please use a PDF or Word file.'));
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [dispatch, t]);

  useEffect(() => {
    if (!analyzedFile || importedAnalysisFileRef.current === analyzedFile) return;

    importedAnalysisFileRef.current = analyzedFile;
    void importCV(analyzedFile);
  }, [analyzedFile, importCV]);

  const undoLastChange = () => {
    const previousBuilder = builderSnapshots[builderSnapshots.length - 1];
    if (!previousBuilder) return;
    dispatch(restoreBuilderSnapshot({ nextBuilder: previousBuilder, currentBuilder: builderSnapshotFrom(builderState) }));
    setWorkspaceKey((key) => key + 1);
  };

  const redoLastChange = () => {
    const nextBuilder = redoSnapshots[redoSnapshots.length - 1];
    if (!nextBuilder) return;
    dispatch(reapplyBuilderSnapshot({ nextBuilder, currentBuilder: builderSnapshotFrom(builderState) }));
    setWorkspaceKey((key) => key + 1);
  };

  const saveCV = async () => {
    setSaving(true);
    const resolvedTitle = title.trim() || formData.personalInfo.professionalTitle.trim();
    const payload = { ...formData, title: resolvedTitle, template: choosenTemp, sectionOrder, fontScale };
    try {
      if (currentCvId) {
        await axios.put(CV_ENDPOINTS.update(currentCvId), payload, { withCredentials: true });
      } else {
        const response = await axios.post(CV_ENDPOINTS.save, payload, { withCredentials: true });
        const newId = response.data?.cv?.id;
        if (newId) dispatch(setCurrentCvId(newId));
        track('cv_created');
      }
      if (resolvedTitle && !title.trim()) dispatch(setCvTitle(resolvedTitle));
      flashNotice('success', t('CV saved successfully!'));
    } catch (error) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined;
      flashNotice('error', message || t('Error saving CV'));
    } finally {
      setSaving(false);
    }
  };

  const pdfProps = useMemo(
    () => ({ ...cvFormToPdfProps(formData), sectionOrder, fontScale }),
    [formData, sectionOrder, fontScale],
  );

  const checks = useMemo(
    () => runCvChecks(formData, sectionOrder, pageCount, fontScale),
    [formData, sectionOrder, pageCount, fontScale],
  );
  const warningCount = checks.filter((check) => check.severity === 'warning').length;

  const polishWeakExperience = async () => Promise.all(
    formData.experience.map(async (experience) => {
      if (!hasWeakBullets(experience.description || '')) return experience;
      const response = await axios.post(
        AI_ENDPOINTS.polishEntry,
        { sectionName: 'experience', raw: experience.description, jobTitle: experience.jobTitle, formData },
        { withCredentials: true },
      );
      return { ...experience, description: response.data.polished };
    }),
  );

  const applyAiSuggestion = async (checkId: string) => {
    if (checkId === 'weak-verbs') {
      dispatch(updateFormData({ ...formData, experience: await polishWeakExperience() }));
    } else if (checkId === 'summary-too-short') {
      const response = await axios.post(
        AI_ENDPOINTS.editFieldAI,
        { sectionName: 'summary', userPrompt: 'Write a concise professional summary using only facts already in this CV.', currentContent: formData.personalInfo.ProfessionalSummary, context: {}, formData },
        { withCredentials: true },
      );
      dispatch(updateSection({ section: 'personalInfo', data: { ProfessionalSummary: response.data.result } }));
    } else if (checkId === 'too-few-skills') {
      const response = await axios.post(AI_ENDPOINTS.generateSmartSkills, { formData }, { withCredentials: true });
      const currentCategories = formData.skills.skillCategories || [];
      if (Array.isArray(response.data?.skillCategories)) {
        const merged = mergeSkillCategories(currentCategories, response.data.skillCategories);
        dispatch(updateSection({ section: 'skills', data: { skillCategories: merged } }));
      } else if (Array.isArray(response.data?.skills)) {
        const merged = mergeSkillsIntoCategories(currentCategories, response.data.skills);
        dispatch(updateSection({ section: 'skills', data: { skillCategories: merged } }));
      }
    } else if (checkId === 'too-many-pages') {
      const response = await axios.post(
        AI_ENDPOINTS.optimizeCvLength,
        { formData, currentPages: pageCount },
        { withCredentials: true },
      );
      dispatch(updateFormData({
        ...response.data.formData,
        personalInfo: { ...response.data.formData.personalInfo, photo: formData.personalInfo.photo },
        customSections: formData.customSections,
      }));
    }
  };

  const applyCvSuggestion = async (check: CvCheck) => {
    const step = sectionOrder.indexOf(check.section);
    if (step >= 0) setActiveStep(step);
    if (check.id === 'missing-contact' || check.id === 'no-numbers') {
      setChecksAnchor(null);
      flashNotice('info', t('Add the missing factual information in the highlighted section.'));
      return;
    }

    setApplyingCheckId(check.id);
    try {
      if (check.id === 'section-order') dispatch(setSectionOrder(preferredSectionOrder(sectionOrder)));
      else if (check.id === 'font-too-small') dispatch(setFontScale(MIN_READABLE_FONT_SCALE));
      // Reformatting a date the user already entered invents nothing, so it needs no AI call.
      // Only a bare month/year can be rewritten; a hand-typed range has to go back to the user
      // rather than leaving the click looking like it did nothing.
      else if (check.id === 'mixed-dates') {
        const spelled = spellOutCvDates(formData);
        dispatch(updateFormData(spelled));
        if (detectDateStyles(spelled).length > 1) {
          setChecksAnchor(null);
          flashNotice('info', t('Some dates need fixing by hand — edit the date fields in the highlighted section.'));
          return;
        }
      }
      else await applyAiSuggestion(check.id);
      setWorkspaceKey((key) => key + 1);
      setChecksAnchor(null);
      flashNotice('success', t('CV suggestion applied.'));
    } catch {
      flashNotice('error', t('We could not apply that suggestion. Please try again.'));
    } finally {
      setApplyingCheckId(null);
    }
  };

  // The server prints the same template the preview renders, so the download matches what
  // is on screen instead of being a second hand-written implementation of the design.
  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const response = await axios.post(
        CV_ENDPOINTS.exportPdf,
        { formData, sectionOrder, template: choosenTemp, fontScale, name: pdfProps.name },
        { withCredentials: true, responseType: 'blob' },
      );
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${pdfProps.name.replace(/\s+/g, '_') || 'My'}_CV.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      // The preview only estimates where pages break; the printed file is the real answer.
      const printedPages = Number(response.headers['x-page-count']);
      if (Number.isFinite(printedPages) && printedPages > 0) dispatch(setPageCount(printedPages));
      track('cv_downloaded');
    } catch {
      flashNotice('error', t('We could not generate the PDF. Please try again.'));
    } finally {
      setDownloading(false);
    }
  };

  const applyOptimizedFormData = (optimizedFormData: typeof formData) => {
    dispatch(recordBuilderSnapshot(builderSnapshotFrom(builderState)));
    dispatch(updateFormData(optimizedFormData));
    setWorkspaceKey((key) => key + 1);
    flashNotice('success', t('Final safe fixes applied.'));
  };

  const noticeBar = notice && (
    <Box sx={builder.alertBar}>
      <Alert severity={notice.type}>{notice.text}</Alert>
    </Box>
  );

  return (
    <Box sx={builder.root}>
      {noticeBar}

      <Tooltip title={t('Home')}>
        <IconButton onClick={() => navigate('/')} sx={builder.homeButton}>
          <Home size={20} />
        </IconButton>
      </Tooltip>

      {done ? (
        <BuilderDoneView
          formData={formData}
          sectionOrder={sectionOrder}
          template={choosenTemp}
          fontScale={fontScale}
          saving={saving}
          downloading={downloading}
          onBack={() => setDone(false)}
          onSave={saveCV}
          onDownload={downloadPdf}
          onApply={applyOptimizedFormData}
        />
      ) : (
        <>
          <BuilderNavigation
            title={title}
            titlePlaceholder={formData.personalInfo.professionalTitle.trim() || t('Untitled CV')}
            steps={steps}
            activeStep={activeStep}
            onTitleChange={(nextTitle) => dispatch(setCvTitle(nextTitle))}
            onStepChange={setActiveStep}
            onAddSection={() => setAddSectionOpen(true)}
          />

          <Box sx={builder.mobileSwitch}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={mobileView}
              onChange={(_, next) => next && setMobileView(next)}
              sx={builder.mobileSwitchGroup}
            >
              <ToggleButton value="form">{t('Edit Fields')}</ToggleButton>
              <ToggleButton value="preview">{t('Preview')}</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Box sx={builder.contentRow}>
            <Box sx={builder.editorPane(mobileView === 'form')}>
              <FormWorkspace
                key={workspaceKey}
                activeStep={activeStep}
                stepCount={steps.length}
                sectionOrder={sectionOrder}
                onBack={() => setActiveStep((s) => Math.max(0, s - 1))}
                onNext={() => setActiveStep((s) => Math.min(steps.length - 1, s + 1))}
                onFinish={() => setDone(true)}
              />
            </Box>
            <Box sx={builder.previewPane(mobileView === 'preview')}>
              <LivePreviewPane />
            </Box>
          </Box>

          <BuilderDock
            saving={saving}
            downloading={downloading}
            importing={importing}
            undoCount={builderSnapshots.length}
            redoCount={redoSnapshots.length}
            checkCount={checks.length}
            warningCount={warningCount}
            fileInputRef={fileInputRef}
            onUndo={undoLastChange}
            onRedo={redoLastChange}
            onChooseTemplate={() => setTemplateOpen(true)}
            onEditWithAi={() => setChatOpen(true)}
            onSave={saveCV}
            onShowChecks={setChecksAnchor}
            onDownload={downloadPdf}
            onImport={importCV}
          />

          <CvSuggestionsPopover
            anchor={checksAnchor}
            checks={checks}
            applyingCheckId={applyingCheckId}
            onClose={() => setChecksAnchor(null)}
            onApply={(check) => void applyCvSuggestion(check)}
          />

          <AddSectionDialog
            open={addSectionOpen}
            onClose={() => setAddSectionOpen(false)}
            onCreate={(sectionTitle) => {
              dispatch(addCustomSection(sectionTitle));
              setActiveStep(sectionOrder.length);
            }}
          />

          <ConversationalBuilder open={chatOpen} onClose={() => setChatOpen(false)} onUpdate={() => setWorkspaceKey((k) => k + 1)} />
          <ChooseTemplate open={templateOpen} onClose={() => setTemplateOpen(false)} />
        </>
      )}
    </Box>
  );
};

export default Builder;
