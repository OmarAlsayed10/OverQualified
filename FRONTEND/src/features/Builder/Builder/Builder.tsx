import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Badge,
  Box,
  Button,
  CircularProgress,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Popover,
  Select,
  Step,
  StepButton,
  Stepper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { ArrowLeft, CheckCircle2, Download, Plus, LayoutTemplate, Redo, Save, ShieldAlert, Sparkles, Undo, Upload, Home } from "../../../components/icons/MuiIcons";
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
import BuilderReviewPanel from './BuilderReviewPanel';
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
        <>
          <Box sx={builder.donePreview}>
            <Box sx={builder.donePreviewDocument}>
              <LivePreviewPane />
            </Box>
            <Box sx={builder.doneReviewRail}>
              <BuilderReviewPanel
                formData={formData}
                sectionOrder={sectionOrder}
                template={choosenTemp}
                fontScale={fontScale}
                onApply={applyOptimizedFormData}
              />
            </Box>
          </Box>
          <Box sx={builder.doneBar}>
            <Button startIcon={<ArrowLeft size={18} />} onClick={() => setDone(false)} sx={builder.ghostButton}>
              {t('Back')}
            </Button>
            <Button
              variant="outlined"
              startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Save size={18} />}
              onClick={saveCV}
              disabled={saving}
              sx={builder.secondaryButton}
            >
              {saving ? t('Saving...') : t('Save to Profile')}
            </Button>
            <Button
              variant="contained"
              startIcon={downloading ? <CircularProgress size={18} color="inherit" /> : <Download size={18} />}
              onClick={downloadPdf}
              disabled={downloading}
              sx={builder.primaryButton}
            >
              {downloading ? t('Generating...') : t('Download')}
            </Button>
          </Box>
        </>
      ) : (
        <>
          <Box sx={builder.nameBar}>
            <TextField
              size="small"
              variant="standard"
              value={title}
              onChange={(event) => dispatch(setCvTitle(event.target.value))}
              placeholder={formData.personalInfo.professionalTitle.trim() || t('Untitled CV')}
              inputProps={{ maxLength: 80, 'aria-label': t('CV name') }}
              sx={builder.nameField}
            />
          </Box>

          <Box sx={builder.stepperBar}>
            <Stepper nonLinear activeStep={activeStep} alternativeLabel sx={builder.stepper}>
              {steps.map((label, index) => (
                <Step key={`${label}-${index}`}>
                  <StepButton onClick={() => setActiveStep(index)}>{t(label)}</StepButton>
                </Step>
              ))}
            </Stepper>
            <Tooltip title={t('Add a section')}>
              <IconButton onClick={() => setAddSectionOpen(true)} sx={{ ml: 1, flexShrink: 0 }}>
                <Plus size={20} />
              </IconButton>
            </Tooltip>
            <Box sx={builder.stepperCompact}>
              <Typography sx={builder.stepperCompactCount}>
                {activeStep + 1}/{steps.length}
              </Typography>
              <Select
                variant="standard"
                disableUnderline
                value={activeStep}
                onChange={(event) => setActiveStep(Number(event.target.value))}
                sx={builder.stepperCompactSelect}
              >
                {steps.map((label, index) => (
                  <MenuItem key={label} value={index}>{t(label)}</MenuItem>
                ))}
              </Select>
            </Box>
          </Box>

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

          <Box sx={builder.dock}>
            <Box sx={builder.dockItem}>
              <Tooltip title={t('Undo last change')}>
                <span>
                  <IconButton onClick={undoLastChange} disabled={builderSnapshots.length === 0} sx={builder.dockButton}>
                    <Undo size={22} />
                  </IconButton>
                </span>
              </Tooltip>
              <Typography sx={builder.dockLabel}>{t('Undo')}</Typography>
            </Box>

            <Box sx={builder.dockItem}>
              <Tooltip title={t('Redo last change')}>
                <span>
                  <IconButton onClick={redoLastChange} disabled={redoSnapshots.length === 0} sx={builder.dockButton}>
                    <Redo size={22} />
                  </IconButton>
                </span>
              </Tooltip>
              <Typography sx={builder.dockLabel}>{t('Redo')}</Typography>
            </Box>

            <Box sx={builder.dockItem}>
              <Tooltip title={t('Choose Template')}>
                <IconButton onClick={() => setTemplateOpen(true)} sx={builder.dockButton}>
                  <LayoutTemplate size={22} />
                </IconButton>
              </Tooltip>
              <Typography sx={builder.dockLabel}>{t('Choose Template')}</Typography>
            </Box>

            <Box sx={builder.dockItem}>
              <Tooltip title={t('Edit with AI')}>
                <IconButton onClick={() => setChatOpen(true)} sx={builder.dockButton}>
                  <Sparkles size={22} />
                </IconButton>
              </Tooltip>
              <Typography sx={builder.dockLabel}>{t('Edit with AI')}</Typography>
            </Box>

            <Box sx={builder.dockItem}>
              <Tooltip title={t('Save')}>
                <IconButton onClick={saveCV} disabled={saving} sx={builder.dockButton}>
                  {saving ? <CircularProgress size={20} /> : <Save size={22} />}
                </IconButton>
              </Tooltip>
              <Typography sx={builder.dockLabel}>{t('Save')}</Typography>
            </Box>

            <Box sx={builder.dockItem}>
              <Tooltip title={t('CV Suggestions')}>
                <IconButton onClick={(event) => setChecksAnchor(event.currentTarget)} sx={builder.dockButton}>
                  <Badge badgeContent={checks.length} color={warningCount > 0 ? 'error' : 'primary'}>
                    {checks.length === 0 ? <CheckCircle2 size={22} /> : <ShieldAlert size={22} />}
                  </Badge>
                </IconButton>
              </Tooltip>
              <Typography sx={builder.dockLabel}>{t('CV Suggestions')}</Typography>
            </Box>

            <Box sx={builder.dockItem}>
              <Tooltip title={t('Download')}>
                <IconButton onClick={downloadPdf} disabled={downloading} sx={builder.dockButton}>
                  {downloading ? <CircularProgress size={20} /> : <Download size={22} />}
                </IconButton>
              </Tooltip>
              <Typography sx={builder.dockLabel}>{t('Download')}</Typography>
            </Box>

            <Box sx={builder.dockItem}>
              <Tooltip title={t('Upload CV')}>
                <IconButton component="label" sx={builder.dockButton}>
                  {importing ? <CircularProgress size={20} /> : <Upload size={22} />}
                  <input
                    hidden
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(event) => importCV(event.target.files?.[0])}
                  />
                </IconButton>
              </Tooltip>
              <Typography sx={builder.dockLabel}>{t('Upload CV')}</Typography>
            </Box>
          </Box>

          <Popover
            open={Boolean(checksAnchor)}
            anchorEl={checksAnchor}
            onClose={() => setChecksAnchor(null)}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            slotProps={{ paper: { sx: { maxWidth: 340, borderRadius: 2 } } }}
          >
            {checks.length === 0 ? (
              <Typography sx={{ p: 2, fontSize: 13 }}>{t('No issues found. Your CV covers the basics.')}</Typography>
            ) : (
              <List dense disablePadding>
                {checks.map((check) => (
                  <ListItemButton
                    key={check.id}
                    onClick={() => void applyCvSuggestion(check)}
                    disabled={applyingCheckId !== null}
                    sx={{ alignItems: 'flex-start', gap: 1 }}
                  >
                    <Box sx={{ mt: '2px', color: check.severity === 'warning' ? 'error.main' : 'text.secondary' }}>
                      {applyingCheckId === check.id ? <CircularProgress size={16} /> : <ShieldAlert size={16} />}
                    </Box>
                    <ListItemText
                      primary={t(check.message, check.values)}
                      primaryTypographyProps={{ fontSize: 12.5, lineHeight: 1.45 }}
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Popover>

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
