import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import axios from "axios";
import {
  Box, Button, Chip, CircularProgress, Collapse, Link, Paper, Stack, Typography,
} from "@mui/material";
import CompassIcon from "@mui/icons-material/Explore";
import TargetIcon from "@mui/icons-material/TrackChanges";
import CheckIcon from "@mui/icons-material/Check";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LaunchIcon from "@mui/icons-material/Launch";
import SparklesIcon from "@mui/icons-material/AutoAwesome";
import SchoolIcon from "@mui/icons-material/School";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import TerminalIcon from "@mui/icons-material/Terminal";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import PsychologyIcon from "@mui/icons-material/Psychology";
import { useTranslation } from "react-i18next";
import { ROADMAP_ENDPOINTS } from "../../../constants/endpoints";
import type { VacancyMatch, VacancyRequirement } from "../CareerMatch.types";
import { careerRoadmapTokens as colors } from "./careerRoadmap.tokens";
import { COLORS } from "../../../theme/tokens";
import type { RoadmapSource, RoadmapStep, SkillRoadmapDetails } from "./CareerRoadmap.types";

const categoryLabels: Record<VacancyRequirement["category"], string> = {
  skill: "Requirement category: skill",
  experience: "Requirement category: experience",
  education: "Requirement category: education",
  certification: "Requirement category: certification",
  eligibility: "Requirement category: eligibility",
  responsibility: "Requirement category: responsibility",
};

const roadmapSteps = (analysis: RoadmapSource): RoadmapStep[] => [
  ...analysis.partialRequirements.map((requirement) => ({ ...requirement, evidenceStatus: "partial" as const })),
  ...analysis.missingRequirements.map((requirement) => ({ ...requirement, evidenceStatus: "missing" as const })),
].sort((first, second) => Number(second.priority === "must_have") - Number(first.priority === "must_have"));

const StepCard = ({ step }: { step: RoadmapStep }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<SkillRoadmapDetails | null>(null);
  const [learned, setLearned] = useState(false);

  const fetchRoadmap = async () => {
    if (details || loading) return;
    setLoading(true);
    try {
      const { data } = await axios.post<{ roadmap: SkillRoadmapDetails }>(
        ROADMAP_ENDPOINTS.getRoadmap,
        { skill: step.requirement, category: step.category },
        { withCredentials: true }
      );
      if (data?.roadmap) {
        setDetails(data.roadmap);
      }
    } catch {
      setDetails({
        skill: step.requirement,
        skillKey: step.requirement.toLowerCase(),
        category: step.category,
        officialDocs: { title: `${step.requirement} Docs & Guide`, url: `https://www.google.com/search?q=${encodeURIComponent(step.requirement + " official documentation")}` },
        playground: null,
        projectIdeas: [
          `Build a hands-on demo project incorporating ${step.requirement} and push to GitHub.`,
          `Document your practical experience with ${step.requirement} in your CV.`,
        ],
        courseLinks: [
          { title: `${step.requirement} Tutorial Video`, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(step.requirement + " tutorial 2026")}` }
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) {
      fetchRoadmap();
    }
  };

  const toggleLearned = async () => {
    const nextState = !learned;
    setLearned(nextState);
    try {
      await axios.post(
        ROADMAP_ENDPOINTS.updateProgress,
        { skill: step.requirement, status: nextState ? "learned" : "in_progress" },
        { withCredentials: true }
      );
    } catch (err) {
      console.warn("Could not save skill progress to server:", err);
    }
  };

  const statusKey = step.evidenceStatus === "partial" ? "Partially evidenced in your CV" : "Not evidenced in your CV";

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3.5,
        border: `1.5px solid ${learned ? COLORS.primary : colors.border}`,
        bgcolor: learned ? COLORS.bgIconTinted : COLORS.bgWhite,
        transition: "all 0.2s ease",
      }}
    >
      <Stack direction="row" gap={1} alignItems="center" justifyContent="space-between" flexWrap="wrap">
        <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
          <Typography sx={{ fontWeight: 850, fontSize: 16, color: colors.ink }}>
            {step.requirement}
          </Typography>
          <Chip size="small" label={t(step.priority === "must_have" ? "Must-have" : "Preferred")} color={step.priority === "must_have" ? "warning" : "default"} sx={{ fontWeight: 700 }} />
          <Chip size="small" label={t(categoryLabels[step.category])} variant="outlined" sx={{ fontSize: 11 }} />
          {learned && (
            <Chip icon={<CheckIcon sx={{ fontSize: 14 }} />} size="small" label={t("Learned & Ready")} color="success" sx={{ fontWeight: 800 }} />
          )}
        </Stack>

        <Button
          size="small"
          onClick={toggleExpand}
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <CompassIcon sx={{ fontSize: 16 }} />}
          sx={{ textTransform: "none", fontWeight: 800, color: colors.primary }}
        >
          {expanded ? t("Hide Roadmap") : t("Explore Learning Roadmap & Projects")}
        </Button>
      </Stack>

      <Typography sx={{ color: colors.muted, fontSize: 14, mt: 1 }}>{step.explanation}</Typography>

      <Stack direction="row" gap={1} alignItems="center" mt={1.5} justifyContent="space-between" flexWrap="wrap">
        <Typography sx={{ color: learned ? colors.primary : step.evidenceStatus === "partial" ? colors.amber : COLORS.danger, fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center" }}>
          {learned ? (
            <>
              <CheckCircleIcon sx={{ fontSize: 16, mr: 0.5, color: colors.primary }} />
              {t("Marked as learned and added to your preparation")}
            </>
          ) : t(statusKey)}
        </Typography>

        <Button
          size="small"
          variant={learned ? "outlined" : "contained"}
          color={learned ? "inherit" : "primary"}
          onClick={toggleLearned}
          startIcon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
          sx={{
            textTransform: "none",
            fontWeight: 800,
            borderRadius: 2,
            px: 2,
            bgcolor: learned ? "transparent" : colors.primary,
            color: learned ? colors.ink : COLORS.onAccent,
            "&:hover": { bgcolor: learned ? COLORS.bgIconTinted : COLORS.primarySurfaceDark, color: learned ? colors.ink : COLORS.onAccent },
          }}
        >
          {learned ? t("Mark as In Progress") : t("Mark as Learned / Added to CV")}
        </Button>
      </Stack>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box sx={{ mt: 2.5, pt: 2, borderTop: "1px dashed #d0dad3" }}>
          {loading ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 2, color: colors.muted }}>
              <CircularProgress size={18} sx={{ color: colors.primary }} />
              <Typography sx={{ fontSize: 14 }}>{t("Building customized roadmap, interactive sandbox, and project ideas...")}</Typography>
            </Box>
          ) : details ? (
            <Stack spacing={2}>
              {/* Learning Links Header */}
              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                {details.officialDocs && (
                  <Paper elevation={0} sx={{ p: 1.5, px: 2, borderRadius: 2.5, bgcolor: COLORS.bgIconTinted, border: "1px solid #cbe0d3", flex: 1, minWidth: 200 }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 800, color: colors.primary, textTransform: "uppercase", letterSpacing: ".05em", display: "flex", alignItems: "center", gap: 0.75 }}>
                      <MenuBookIcon sx={{ fontSize: 15 }} />
                      {t("Official Documentation")}
                    </Typography>
                    <Link href={details.officialDocs.url} target="_blank" rel="noreferrer" sx={{ display: "flex", alignItems: "center", gap: 0.5, fontWeight: 800, color: colors.ink, mt: 0.5, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>
                      {details.officialDocs.title} <LaunchIcon sx={{ fontSize: 14 }} />
                    </Link>
                  </Paper>
                )}

                {details.playground && (
                  <Paper elevation={0} sx={{ p: 1.5, px: 2, borderRadius: 2.5, bgcolor: COLORS.warningSoft, border: "1px solid #f2e2c6", flex: 1, minWidth: 200 }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 800, color: colors.amber, textTransform: "uppercase", letterSpacing: ".05em", display: "flex", alignItems: "center", gap: 0.75 }}>
                      <TerminalIcon sx={{ fontSize: 15 }} />
                      {t("Interactive Sandbox / Testing")}
                    </Typography>
                    <Link href={details.playground.url} target="_blank" rel="noreferrer" sx={{ display: "flex", alignItems: "center", gap: 0.5, fontWeight: 800, color: colors.ink, mt: 0.5, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>
                      {details.playground.title} <LaunchIcon sx={{ fontSize: 14 }} />
                    </Link>
                  </Paper>
                )}
              </Box>

              {/* Practical Project Ideas */}
              {details.projectIdeas.length > 0 && (
                <Box sx={{ p: 2, borderRadius: 3, bgcolor: COLORS.surfaceSubtle, border: "1px solid #e1e8e3" }}>
                  <Typography sx={{ fontWeight: 850, fontSize: 14, color: colors.ink, display: "flex", alignItems: "center", gap: 1 }}>
                    <SparklesIcon sx={{ fontSize: 16, color: colors.primary }} /> {t("Hands-on Projects to Build by Yourself")}
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: colors.muted, mt: 0.5 }}>
                    {t("Complete one of these projects and add it to your CV to permanently satisfy this requirement:")}
                  </Typography>
                  <Stack spacing={1} mt={1.5}>
                    {details.projectIdeas.map((idea, i) => (
                      <Stack key={i} direction="row" gap={1} alignItems="flex-start">
                        <Box sx={{ minWidth: 20, height: 20, borderRadius: "50%", bgcolor: colors.primary, color: COLORS.onAccent, fontSize: 11, fontWeight: 800, display: "grid", placeItems: "center", mt: 0.25 }}>
                          {i + 1}
                        </Box>
                        <Typography sx={{ fontSize: 13.5, color: colors.ink, fontWeight: 600 }}>{idea}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Free Courses / Guides */}
              {details.courseLinks.length > 0 && (
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 800, color: colors.muted, textTransform: "uppercase", letterSpacing: ".05em", display: "flex", alignItems: "center", gap: 0.75 }}>
                    <SchoolIcon sx={{ fontSize: 15 }} />
                    {t("Recommended Free Guides & Tutorials")}
                  </Typography>
                  <Stack direction="row" gap={1.5} flexWrap="wrap" mt={1}>
                    {details.courseLinks.map((course, idx) => (
                      <Link key={idx} href={course.url} target="_blank" rel="noreferrer" sx={{ fontSize: 13, fontWeight: 700, color: colors.primary, display: "flex", alignItems: "center", gap: 0.5 }}>
                        <SchoolIcon sx={{ fontSize: 15 }} /> {course.title} <LaunchIcon sx={{ fontSize: 13 }} />
                      </Link>
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          ) : null}
        </Box>
      </Collapse>
    </Paper>
  );
};

export default function CareerRoadmap({ analysis }: { analysis: VacancyMatch }) {
  const { t } = useTranslation();
  const steps = roadmapSteps(analysis);
  if (!steps.length) return null;

  return (
    <Box sx={{ mt: 4 }}>
      <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3.5 }, borderRadius: 4, bgcolor: colors.sand, border: `1px solid ${colors.border}` }}>
        <Stack direction="row" gap={1} alignItems="center">
          <TargetIcon sx={{ fontSize: 22, color: colors.primary }} />
          <Typography variant="h5" sx={{ fontWeight: 850, color: colors.ink }}>
            {t("Your readiness roadmap")}
          </Typography>
        </Stack>

        <Typography sx={{ color: colors.muted, mt: 1, maxWidth: "75ch", fontSize: 14 }}>
          {t("Automated learning plan to bridge missing requirements. Explore real documentation, interactive test environments, and project ideas to build yourself.")}
        </Typography>

        {/* 2026 Trend Callout & Recommended Skills for Continuous Development */}
        <Paper elevation={0} sx={{ p: 2.5, mt: 2.5, borderRadius: 3.5, bgcolor: COLORS.bgDark, color: COLORS.onAccent, border: "1px solid #2a5c45" }}>
          <Stack direction="row" gap={1} alignItems="center" mb={1}>
            <PsychologyIcon sx={{ color: COLORS.success, fontSize: 22 }} />
            <Typography sx={{ fontSize: 15, fontWeight: 850, color: COLORS.onAccent }}>
              {t("2026 High-Demand Market Growth Skills")}
            </Typography>
          </Stack>
          <Typography sx={{ fontSize: 13, color: "rgba(255,255,255,.8)", mb: 2 }}>
            {t("In 2026, companies favor engineers with AI Agentic skills and Full-Stack architecture capability. Upgrade your continuous learning beyond your current CV:")}
          </Typography>

          <Stack direction={{ xs: "column", sm: "row" }} gap={1.5}>
            <Chip
              icon={<TrendingUpIcon sx={{ color: "#81c784 !important", fontSize: 16 }} />}
              label={t("AI Agentic Systems & LLM Workflows")}
              sx={{ bgcolor: "rgba(255,255,255,.1)", color: COLORS.onAccent, fontWeight: 700, py: 2, fontSize: 12.5 }}
            />
            <Chip
              icon={<TrendingUpIcon sx={{ color: "#81c784 !important", fontSize: 16 }} />}
              label={t("Full-Stack Architecture (Next.js & Prisma)")}
              sx={{ bgcolor: "rgba(255,255,255,.1)", color: COLORS.onAccent, fontWeight: 700, py: 2, fontSize: 12.5 }}
            />
          </Stack>

          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
            <Button
              component={RouterLink}
              to="/roadmap"
              size="small"
              endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
              sx={{ fontWeight: 850, color: COLORS.success, textTransform: "none" }}
            >
              {t("Explore All 2026 Market Skill Roadmaps")}
            </Button>
          </Box>
        </Paper>

        <Stack spacing={2} mt={2.5}>
          {steps.map((step, index) => (
            <StepCard key={`${step.requirement}-${index}`} step={step} />
          ))}
        </Stack>
      </Paper>
    </Box>
  );
}
