import { useEffect, useState } from "react";
import axios from "axios";
import {
  Box, Container, Typography, Paper, TextField, MenuItem, Button,
  Chip, CircularProgress, Divider, Link, Pagination, Dialog, DialogContent, DialogTitle,
} from "@mui/material";
import RadarIcon from "@mui/icons-material/Radar";
import AddBusinessRoundedIcon from "@mui/icons-material/AddBusinessRounded";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import DescriptionIcon from "@mui/icons-material/Description";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import ForumRoundedIcon from "@mui/icons-material/ForumRounded";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { JOB_ENDPOINTS } from "../constants/endpoints";
import { useFeedback } from "../context/FeedbackContext";
import CoverLetterModal from "../features/JobRadar/components/CoverLetterModal";
import ABVariantsModal from "../features/JobRadar/components/ABVariantsModal";
import JobAnalytics from "../features/JobRadar/components/JobAnalytics";
import JobRadarTargetsPanel, { JobRadarPreference } from "../features/JobRadar/components/JobRadarTargetsPanel";
import { JobCategoryOption } from "../features/JobRadar/components/RoleCatalogSelector";
import JobSubmissionForm from "../features/JobRadar/components/JobSubmissionForm";
import { COLORS } from "../theme/tokens";

const PRIMARY = COLORS.primary;

interface JobMatch {
  id: string;
  source: string;
  title: string;
  company: string;
  location: string | null;
  url: string;
  fitScore: number | null;
  analysisStatus: string;
  earlyBird: boolean;
  status: string;
  coverLetter?: string | null;
  coverLetterAr?: string | null;
}

const EMPTY_PREF: JobRadarPreference = { roleIds: [], level: "", location: "", remote: false, keywords: "", blocklist: "" };

const JobRadarPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { notify } = useFeedback();
  const [pref, setPref] = useState<JobRadarPreference>(EMPTY_PREF);
  const [categories, setCategories] = useState<JobCategoryOption[]>([]);
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [countries, setCountries] = useState<string[]>([]);
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [coverLetterMatch, setCoverLetterMatch] = useState<JobMatch | null>(null);
  const [variantsMatch, setVariantsMatch] = useState<JobMatch | null>(null);
  const [shareJobOpen, setShareJobOpen] = useState(false);

  const notifyJobRequestError = (error: unknown, fallback: string) => {
    const code = axios.isAxiosError(error) ? error.response?.data?.code : undefined;
    if (code === "JOB_RADAR_REFRESH_LIMIT") {
      notify(t("Too many job searches. Try again in a few minutes."), "warning");
      return;
    }
    const providerMessage = axios.isAxiosError(error) ? error.response?.data?.message : undefined;
    notify(typeof providerMessage === "string" ? providerMessage : t(fallback));
  };

  const applyMatchPage = (data: { matches?: JobMatch[]; total?: number; page?: number; pageSize?: number; countries?: string[] }) => {
    setMatches(data.matches ?? []);
    setTotal(data.total ?? 0);
    setPage(data.page ?? 1);
    if (data.pageSize) setPageSize(data.pageSize);
    if (data.countries) setCountries(data.countries);
  };

  const fetchMatches = async (p: number, c: string = country) => {
    const params = new URLSearchParams({ page: String(p) });
    if (c) params.set("country", c);
    const m = await axios.get(`${JOB_ENDPOINTS.matches}?${params}`, { withCredentials: true });
    applyMatchPage(m.data);
  };

  const changeCountry = (c: string) => {
    setCountry(c);
    fetchMatches(1, c);
  };

  const loadAll = async () => {
    try {
      const [p, m, catalog] = await Promise.all([
        axios.get(JOB_ENDPOINTS.preference, { withCredentials: true }),
        axios.get(`${JOB_ENDPOINTS.matches}?page=1`, { withCredentials: true }),
        axios.get(JOB_ENDPOINTS.catalog, { withCredentials: true }),
      ]);
      if (p.data.preference) {
        const raw = p.data.preference;
        setPref({
          roleIds: Array.isArray(raw.roleIds) ? raw.roleIds : [],
          level: raw.level ?? "",
          location: raw.location ?? "",
          remote: raw.remote ?? false,
          keywords: raw.keywords ?? "",
          blocklist: raw.blocklist ?? "",
        });
      }
      setCategories(catalog.data.categories ?? []);
      applyMatchPage(m.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const savePref = async (nextPreference: JobRadarPreference) => {
    if (nextPreference.roleIds.length === 0) return;
    setPref(nextPreference);
    setSaving(true);
    try {
      const response = await axios.post(JOB_ENDPOINTS.preference, nextPreference, { withCredentials: true });
      setCountry("");
      applyMatchPage(response.data);
    } catch (error: unknown) {
      notifyJobRequestError(error, "Could not find jobs. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      const res = await axios.post(JOB_ENDPOINTS.refresh, {}, { withCredentials: true });
      applyMatchPage(res.data);
    } catch (error: unknown) {
      notifyJobRequestError(error, "Could not refresh jobs. Try again.");
    } finally {
      setRefreshing(false);
    }
  };

  const setStatus = async (id: string, status: string) => {
    if (status === "dismissed") {
      setMatches((prev) => prev.filter((x) => x.id !== id));
      setTotal((n) => Math.max(0, n - 1));
    } else {
      setMatches((prev) => prev.map((x) => (x.id === id ? { ...x, status } : x)));
    }
    await axios.patch(JOB_ENDPOINTS.status(id), { status }, { withCredentials: true });
  };


  return (
    <Box sx={{ bgcolor: COLORS.bgLight, minHeight: "100vh", py: { xs: 5, md: 8 } }}>
      <Container maxWidth={false} disableGutters sx={{ px: { xs: 2, sm: 4, lg: 6 } }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, mb: 1, flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <RadarIcon sx={{ color: PRIMARY, fontSize: 34 }} />
            <Typography variant="h4" sx={{ fontWeight: "bold", color: COLORS.textPrimary }}>{t("Job Radar")}</Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddBusinessRoundedIcon />}
            onClick={() => setShareJobOpen(true)}
            sx={{ bgcolor: PRIMARY, textTransform: "none", fontWeight: 800, borderRadius: "10px", px: 2, "&:hover": { bgcolor: COLORS.primarySurfaceDark } }}
          >
            {t("Share a job")}
          </Button>
        </Box>
        <Typography sx={{ color: COLORS.textSecondary, mb: 4 }}>
          {t("We find fresh, low-competition jobs matched to your CV")}
        </Typography>
        <JobRadarTargetsPanel
          preference={pref}
          categories={categories}
          saving={saving}
          refreshing={refreshing}
          onSave={savePref}
          onRefresh={refresh}
        />

        <Box component="section" aria-labelledby="job-radar-progress" sx={{ mb: 4 }}>
          <Typography id="job-radar-progress" variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>{t("Your progress")}</Typography>
          <JobAnalytics key={total} />
        </Box>
<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, mb: 2, flexWrap: "wrap" }}>
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            {t("Matches")} {total > 0 && <Chip label={total} size="small" sx={{ ml: 1, bgcolor: COLORS.primaryAlpha12, color: PRIMARY, fontWeight: 700 }} />}
          </Typography>
          <TextField
            select
            size="small"
            label={t("Filter results by country")}
            value={country}
            onChange={(event) => changeCountry(event.target.value)}
            disabled={countries.length === 0}
            sx={{ minWidth: 230 }}
          >
            <MenuItem value="">{t("All countries")}</MenuItem>
            {countries.map((availableCountry) => (
              <MenuItem key={availableCountry} value={availableCountry}>{availableCountry}</MenuItem>
            ))}
          </TextField>
        </Box>

        {loading ? (
          <Box sx={{ textAlign: "center", py: 6 }}><CircularProgress sx={{ color: PRIMARY }} /></Box>
        ) : matches.length === 0 ? (
          <Paper elevation={0} sx={{ p: 5, borderRadius: "20px", textAlign: "center", border: `1px dashed ${COLORS.borderMedium}` }}>
            <Typography sx={{ color: COLORS.textSecondary }}>{t("No matches yet. Set your targets above and hit Save.")}</Typography>
          </Paper>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {matches.map((m) => (
              <Paper key={m.id} elevation={0} sx={{ p: 2.5, borderRadius: "16px", border: `1px solid ${COLORS.borderLight}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                <Box sx={{ flex: 1, minWidth: 240 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 0.5 }}>
                    <Link href={m.url} target="_blank" rel="noopener noreferrer" sx={{ fontWeight: "bold", color: COLORS.textPrimary, textDecoration: "none", "&:hover": { color: PRIMARY } }}>
                      {m.title} <OpenInNewIcon sx={{ fontSize: 14, verticalAlign: "middle" }} />
                    </Link>
                    {m.earlyBird && <Chip label={t("Apply early")} size="small" sx={{ bgcolor: PRIMARY, color: COLORS.onAccent, fontWeight: 700, height: 20 }} />}
                    {m.status === "applied" && <Chip label={t("Applied")} size="small" variant="outlined" sx={{ height: 20, borderColor: PRIMARY, color: PRIMARY }} />}
                  </Box>
                  <Typography sx={{ color: COLORS.textSecondary, fontSize: "0.85rem" }}>
                    {m.company}{m.location ? ` \u00b7 ${m.location}` : ""}{" \u00b7 "}{m.source}{" \u00b7 "}<b style={{ color: PRIMARY }}>{m.analysisStatus === "pending" ? t("Analysis required") : `${m.fitScore}% ${t("match")}`}</b>
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => navigate(`/applications/${m.id}`)}
                    sx={{ textTransform: "none", bgcolor: PRIMARY, color: COLORS.onAccent, fontWeight: 700, "&:hover": { bgcolor: COLORS.primarySurfaceDark } }}
                  >
                    {t("Prepare Application")}
                  </Button>
                  <Button size="small" startIcon={<CompareArrowsIcon sx={{ fontSize: 16 }} />} onClick={() => navigate(`/career-match?mode=vacancy&jobId=${m.id}&title=${encodeURIComponent(m.title)}`)} sx={{ textTransform: "none", color: PRIMARY, fontWeight: 700, bgcolor: "rgba(42,92,69,0.08)", "&:hover": { bgcolor: "rgba(42,92,69,0.16)" } }}>
                    {t("Match vacancy")}
                  </Button>
                  <Button size="small" startIcon={<ForumRoundedIcon sx={{ fontSize: 16 }} />} onClick={() => navigate(`/interview-coach?jobId=${encodeURIComponent(m.id)}`)} sx={{ textTransform: "none", color: PRIMARY, fontWeight: 700 }}>
                    {t("Practice interview for this job")}
                  </Button>
                  <Button size="small" startIcon={<DescriptionIcon sx={{ fontSize: 16 }} />} onClick={() => setCoverLetterMatch(m)} sx={{ textTransform: "none", color: PRIMARY, fontWeight: 600 }}>
                    {t("Cover letter")}
                  </Button>
                  <Button size="small" startIcon={<CompareArrowsIcon sx={{ fontSize: 16 }} />} onClick={() => setVariantsMatch(m)} sx={{ textTransform: "none", color: PRIMARY, fontWeight: 600 }}>
                    {t("Tailor A/B")}
                  </Button>
                  {m.status !== "applied" && (
                    <Button size="small" onClick={() => setStatus(m.id, "applied")} sx={{ textTransform: "none", color: PRIMARY, fontWeight: 600 }}>
                      {t("Mark applied")}
                    </Button>
                  )}
                  <Button size="small" onClick={() => setStatus(m.id, "dismissed")} sx={{ textTransform: "none", color: COLORS.textSecondary }}>
                    {t("Dismiss")}
                  </Button>
                </Box>
              </Paper>
            ))}
          </Box>
        )}

        {total > pageSize && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
            <Pagination
              count={Math.ceil(total / pageSize)}
              page={page}
              onChange={(_, p) => fetchMatches(p)}
              sx={{ "& .Mui-selected": { bgcolor: "rgba(42,92,69,0.15) !important", color: PRIMARY } }}
            />
          </Box>
        )}
        <Divider sx={{ mt: 5, opacity: 0 }} />
      </Container>

      <CoverLetterModal
        open={!!coverLetterMatch}
        onClose={() => setCoverLetterMatch(null)}
        matchId={coverLetterMatch?.id ?? null}
        matchTitle={coverLetterMatch?.title ?? ""}
        matchCompany={coverLetterMatch?.company ?? ""}
        coverLetter={coverLetterMatch?.coverLetter ?? null}
        coverLetterAr={coverLetterMatch?.coverLetterAr ?? null}
      />
      <ABVariantsModal
        open={!!variantsMatch}
        onClose={() => setVariantsMatch(null)}
        matchId={variantsMatch?.id ?? null}
        matchTitle={variantsMatch?.title ?? ""}
        matchCompany={variantsMatch?.company ?? ""}
      />
      <Dialog open={shareJobOpen} onClose={() => setShareJobOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>{t("Share a job")}</DialogTitle>
        <DialogContent dividers sx={{ p: { xs: 2.5, sm: 3 } }}>
          <JobSubmissionForm onSubmitted={() => setShareJobOpen(false)} />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default JobRadarPage;
