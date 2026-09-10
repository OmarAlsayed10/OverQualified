import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  Autocomplete, Box, Button, Chip, CircularProgress, Container,
  MenuItem, Paper, Stack, TextField, Typography,
} from "@mui/material";
import { BriefcaseBusiness, Compass, FileText, Radar, UploadCloud } from "../components/icons/MuiIcons";
import { useTranslation } from "react-i18next";
import { AI_ENDPOINTS, JOB_ENDPOINTS } from "../constants/endpoints";
import CareerMatchResults from "../features/CareerMatch/CareerMatchResults";
import type { CareerMatchResponse,LiveMarketStatus } from "../features/CareerMatch/CareerMatch.types";
import CvPicker from "../components/ui/CvPicker";
import type { CvOption } from "../utils/cvOptions";
import { useFeedback } from "../context/FeedbackContext";
import { COLORS } from "../theme/tokens";
import { roleSuggestionForJobDescription, roleSuggestionsFromCv } from "../utils/roleSuggestions";

const palette = { primary: COLORS.primary, dark: COLORS.bgDark, sand: COLORS.bgLight, ink: COLORS.textPrimary, muted: COLORS.textSecondary, amber: COLORS.accentOrange };
type Mode = "discovery" | "vacancy";
const INFER_EXPERIENCE_LEVEL = "infer";

export default function CareerMatchPage() {
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const { notify, showEntitlement } = useFeedback();
  const [mode, setMode] = useState<Mode>("discovery");
  const [file, setFile] = useState<File | null>(null);
  const [savedCv, setSavedCv] = useState<CvOption | null>(null);
  const [autoSelectPrimary, setAutoSelectPrimary] = useState(false);
  const [targetTitle, setTargetTitle] = useState("");
  const [targetTitleTouched, setTargetTitleTouched] = useState(false);
  const [uploadedRoleSuggestions, setUploadedRoleSuggestions] = useState<string[]>([]);
  const [experienceLevel, setExperienceLevel] = useState(INFER_EXPERIENCE_LEVEL);
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState<CareerMatchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const roleOptions = savedCv?.roleSuggestions ?? uploadedRoleSuggestions;
  const suggestedVacancyRole = roleSuggestionForJobDescription(roleOptions, jobDescription);
  const roleMismatch = mode === "vacancy" && jobDescription.trim().length >= 80 && roleOptions.length > 0 && !suggestedVacancyRole;

  useEffect(() => {
    if (mode === "vacancy" && !targetTitleTouched) setTargetTitle(suggestedVacancyRole ?? "");
  }, [mode, suggestedVacancyRole, targetTitleTouched]);

  const selectFile = async (selected: File | undefined) => {
    if (!selected) return;
    setFile(selected);
    setSavedCv(null);
    setUploadedRoleSuggestions([]);
    const upload = new FormData();
    upload.append("cv", selected);
    try {
      const response = await axios.post(AI_ENDPOINTS.importCv, upload, { withCredentials: true });
      if (fileInput.current?.files?.[0] !== selected) return;
      const suggestions = roleSuggestionsFromCv(response.data.formData);
      setUploadedRoleSuggestions(suggestions);
      setTargetTitleTouched(false);
      if (mode === "discovery") setTargetTitle(suggestions[0] || "");
    } catch {
      if (fileInput.current?.files?.[0] !== selected) return;
      setUploadedRoleSuggestions([]);
      notify(t("Could not infer roles from this CV. Enter a target role or leave it blank."));
    }
  };

  const pickSavedCv = (cv: CvOption) => {
    if (cv.text.trim().length < 100) {
      notify(t("That CV is too short to match. Add more detail or upload a PDF/DOCX."));
      return;
    }
    setSavedCv(cv);
    setFile(null);
    setUploadedRoleSuggestions([]);
    if (fileInput.current) fileInput.current.value = "";
    setTargetTitleTouched(false);
    if (mode === "discovery") setTargetTitle(cv.roleSuggestions[0] || "");
  };

  useEffect(() => {
    const paramMode = searchParams.get("mode");
    const jobId = searchParams.get("jobId");
    const title = searchParams.get("title");

    if (paramMode === "vacancy" || jobId) {
      setMode("vacancy");
      if (title) {
        setTargetTitle(title);
        setTargetTitleTouched(true);
      }
      setAutoSelectPrimary(true);

      if (jobId) {
        axios.get(JOB_ENDPOINTS.details(jobId), { withCredentials: true })
          .then(({ data }) => {
            if (data?.description) {
              setJobDescription(data.description);
            }
          })
          .catch(() => {
            notify(t("Could not pre-fill job details automatically. Please paste description manually."));
          });
      }
    }
  }, [searchParams]);

  const submit = async () => {
    setResult(null);
    if (!file && !savedCv) {
      notify(t("Choose a CV file or use your primary CV first."));
      return;
    }
    if (mode === "vacancy" && jobDescription.trim().length < 80) {
      notify(t("Paste the actual vacancy description so the match can be evidence-based."));
      return;
    }

    const form = new FormData();
    if (file) form.append("cv", file);
    if (savedCv) form.append("cvId", savedCv.id);
    if (targetTitle.trim()) form.append("targetJobTitle", targetTitle.trim());
    if (experienceLevel !== INFER_EXPERIENCE_LEVEL) form.append("experienceLevel", experienceLevel);
    if (mode === "vacancy") form.append("jobDescription", jobDescription.trim());
    form.append("useLiveMarket", "false");
    form.append("language", i18n.language.startsWith("ar") ? "ar" : "en");

    setLoading(true);
    try {
      const { data } = await axios.post<CareerMatchResponse>(AI_ENDPOINTS.careerMatch, form, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(data);

      window.dispatchEvent(new Event("quota:refresh"));
    } catch (requestError) {
      if (axios.isAxiosError(requestError)) {
        const data = requestError.response?.data as { code?: string; message?: string; liveMarketStatus?: LiveMarketStatus } | undefined;

        if (data?.code === "CREDITS_EXHAUSTED") {
          showEntitlement("CREDITS_EXHAUSTED");
        } else if (data?.code === "PROVIDER_INVALID_RESPONSE") {
          notify(t("Career Match could not verify the AI result. Please try again."));
        } else {
          notify(data?.message || t("Career Match failed. Please try again."));
        }
      } else {
        notify(t("Career Match failed. Please try again."));
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedCv = file?.name || savedCv?.title || t("No CV selected");

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: palette.sand, pb: 10 }}>
      <Box sx={{ bgcolor: palette.dark, color: COLORS.onAccent, pt: { xs: 7, md: 10 }, pb: { xs: 13, md: 16 }, position: "relative", overflow: "hidden" }}>
        <Container maxWidth="lg">
          <Chip icon={<Radar size={15} />} label={t("Separate from CV Quality")} sx={{ color: COLORS.onAccent, bgcolor: "rgba(255,255,255,.12)", fontWeight: 800, mb: 3 }} />
          <Typography component="h1" sx={{ fontSize: { xs: 40, md: 66 }, lineHeight: .98, letterSpacing: "-.045em", fontWeight: 850, maxWidth: 800 }}>{t("Find the work your experience can grow into.")}</Typography>
          <Typography sx={{ color: "rgba(255,255,255,.72)", fontSize: { xs: 17, md: 20 }, mt: 3, maxWidth: 720 }}>{t("Discover roles from your real evidence, or compare your CV with a vacancy you paste. The target job title is always optional.")}</Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ mt: { xs: -8, md: -10 }, position: "relative" }}>
        <Paper elevation={0} sx={{ borderRadius: 5, overflow: "hidden", border: "1px solid rgba(24,34,29,.08)", boxShadow: "0 24px 70px rgba(25,59,44,.12)" }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, p: 1, bgcolor: COLORS.bgLight }}>
            {([
              { id: "discovery" as const, title: t("Discover my roles"), text: t("No job title required"), icon: <Compass size={22} /> },
              { id: "vacancy" as const, title: t("Match a vacancy"), text: t("Paste the job description"), icon: <BriefcaseBusiness size={22} /> },
            ]).map((item) => (
              <Button key={item.id} onClick={() => { setMode(item.id); setResult(null); }} startIcon={item.icon} sx={{ justifyContent: "flex-start", textAlign: "left", px: 2.5, py: 2, borderRadius: 3.5, color: mode === item.id ? palette.primary : palette.muted, bgcolor: mode === item.id ? COLORS.bgWhite : "transparent", textTransform: "none", boxShadow: mode === item.id ? "0 5px 18px rgba(25,59,44,.08)" : "none", "&:hover": { bgcolor: mode === item.id ? COLORS.bgWhite : "rgba(255,255,255,.45)" } }}>
                <Box><Typography sx={{ fontWeight: 850 }}>{item.title}</Typography><Typography sx={{ fontSize: 12, opacity: .75 }}>{item.text}</Typography></Box>
              </Button>
            ))}
          </Box>

          <Box sx={{ p: { xs: 2.5, md: 5 }, display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.3fr) minmax(280px, .7fr)" }, gap: 4 }}>
            <Stack spacing={2.5}>
              <Box><Typography variant="h5" sx={{ fontWeight: 850, color: palette.ink }}>{mode === "discovery" ? t("What roles fit this CV?") : t("How closely does this CV fit?")}</Typography><Typography sx={{ color: palette.muted, mt: .5 }}>{mode === "discovery" ? t("We look beyond the headline—for example, Full Stack experience can also reveal DevOps or AI engineering directions.") : t("The pasted description is the source of truth. We do not use the older Jobs route.")}</Typography></Box>
              <Autocomplete
                freeSolo
                options={roleOptions}
                value={targetTitle}
                onChange={(_, role) => {
                  setTargetTitle(role || "");
                  setTargetTitleTouched(true);
                }}
                onInputChange={(_, role, reason) => {
                  if (reason !== "input") return;
                  setTargetTitle(role.slice(0, 100));
                  setTargetTitleTouched(true);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t("Target job title (optional)")}
                    placeholder={t("Leave blank to let AI infer your directions")}
                    error={roleMismatch}
                    helperText={roleMismatch
                      ? t("No suggested CV role clearly matches this job description. Career Match will still compare your evidence.")
                      : roleOptions.length
                        ? t("Select a role found in your CV or enter another role.")
                        : t("A hint, never a requirement.")}
                    inputProps={{ ...params.inputProps, maxLength: 100 }}
                  />
                )}
              />
              <TextField select label={t("Experience level (optional)")} value={experienceLevel} onChange={(event) => setExperienceLevel(event.target.value)} fullWidth>
                <MenuItem value={INFER_EXPERIENCE_LEVEL}>{t("Infer from my CV")}</MenuItem>
                {['Fresh', 'Junior', 'Mid', 'Senior', 'Lead'].map((level) => <MenuItem key={level} value={level}>{t(level)}</MenuItem>)}
              </TextField>
              {mode === "vacancy" && <TextField label={t("Actual job description")} value={jobDescription} onChange={(event) => setJobDescription(event.target.value.slice(0, 20000))} placeholder={t("Paste responsibilities, requirements, and preferred skills…")} multiline minRows={8} required helperText={`${jobDescription.length.toLocaleString()} / 20,000 characters`} />}
            </Stack>

            <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: "1.5px dashed #aec3b6", bgcolor: COLORS.surfaceSubtle, alignSelf: "start" }}>
              <Box sx={{ display: "grid", justifyItems: "center", textAlign: "center" }}>
                <Box sx={{ width: 52, height: 52, display: "grid", placeItems: "center", borderRadius: 3, bgcolor: COLORS.bgIconTinted, color: palette.primary }}><FileText size={25} /></Box>
                <Typography sx={{ fontWeight: 850, mt: 2 }}>{t("Your CV")}</Typography>
                <Typography sx={{ color: selectedCv === t("No CV selected") ? palette.muted : palette.primary, fontSize: 14, mt: .5, wordBreak: "break-word" }}>{selectedCv}</Typography>
              </Box>
              <Button fullWidth variant="outlined" startIcon={<UploadCloud size={18} />} onClick={() => fileInput.current?.click()} sx={{ mt: 2.5, py: 1.2, textTransform: "none", borderRadius: 2.5, fontWeight: 800 }}>{t("Upload PDF or DOCX")}</Button>
              <input ref={fileInput} hidden type="file" accept=".pdf,.doc,.docx" onChange={(event) => void selectFile(event.target.files?.[0])} />
              <Box sx={{ mt: 2 }}><CvPicker value={savedCv?.id ?? ""} onSelect={pickSavedCv} autoSelectPrimary={autoSelectPrimary} helperText={t("Your primary CV is marked with a star.")} /></Box>
              <Button fullWidth variant="contained" onClick={submit} disabled={loading} sx={{ mt: 3, py: 1.4, borderRadius: 2.5, bgcolor: palette.primary, textTransform: "none", fontWeight: 850, "&:hover": { bgcolor: palette.dark } }}>{loading ? <><CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />{t("Analyzing…")}</> : mode === "discovery" ? t("Discover my roles") : t("Calculate job match")}</Button>
              <Typography sx={{ color: palette.muted, fontSize: 11.5, mt: 1.5, textAlign: "center" }}>{t("AI estimates—not an ATS decision or hiring guarantee.")}</Typography>
            </Paper>
          </Box>
        </Paper>

        {result && <Box sx={{ mt: 4 }}><CareerMatchResults result={result} /></Box>}
      </Container>
    </Box>
  );
}