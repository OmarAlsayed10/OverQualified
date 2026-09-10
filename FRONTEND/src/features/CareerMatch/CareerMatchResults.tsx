import { Box, Chip, Divider, Link, Paper, Stack, Typography } from "@mui/material";
import { ArrowUpRight, CheckCircle2, Compass, SearchCheck, Sparkles, Target } from "../../components/icons/MuiIcons";
import { useTranslation } from "react-i18next";
import type { CareerMatchResponse, RoleDiscovery, VacancyMatch } from "./CareerMatch.types";
import CareerRoadmap from "./CareerRoadmap";
import { COLORS } from "../../theme/tokens";

const colors = { primary: COLORS.primary, ink: COLORS.textPrimary, muted: COLORS.textSecondary, sand: COLORS.bgLight, amber: COLORS.accentOrange };
const vacancyScoreLabels: Record<VacancyMatch["scoreLabel"], string> = {
  strong_evidence_match: "Strong evidence match",
  partial_evidence_match: "Partial evidence match",
  low_evidence_match: "Limited evidence match",
};

const Score = ({ label, value }: { label: string; value: number }) => {
  const { t } = useTranslation();
  return (
    <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #dfe6e1", borderRadius: 4, minWidth: 150, bgcolor: COLORS.bgWhite }}>
      <Typography sx={{ color: colors.muted, fontSize: 13, fontWeight: 700 }}>{t(label)}</Typography>
      <Typography sx={{ color: colors.primary, fontSize: 38, lineHeight: 1.1, fontWeight: 800 }}>{Math.round(value)}<Box component="span" sx={{ fontSize: 16 }}>/100</Box></Typography>
    </Paper>
  );
};

const Evidence = ({ cv, requirement, rationale }: { cv: string; requirement?: string; rationale: string }) => {
  const { t } = useTranslation();
  return (
    <Box sx={{ mt: 1.5, p: 2, bgcolor: COLORS.surfaceSubtle, borderRadius: 2.5, borderInlineStart: `3px solid ${colors.primary}` }}>
      <Typography sx={{ fontSize: 12, color: colors.muted, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em" }}>{t("CV evidence")}</Typography>
      <Typography sx={{ fontSize: 14, color: colors.ink, fontStyle: "italic", mt: .5 }}>"{cv}"</Typography>
      {requirement && <><Typography sx={{ fontSize: 12, color: colors.muted, fontWeight: 800, mt: 1.5 }}>{t("JOB REQUIREMENT")}</Typography><Typography sx={{ fontSize: 14 }}>{requirement}</Typography></>}
      <Typography sx={{ fontSize: 13, color: colors.muted, mt: 1 }}>{rationale}</Typography>
    </Box>
  );
};

const RoleMap = ({ analysis }: { analysis: RoleDiscovery }) => {
  const { t } = useTranslation();
  const primary = analysis.roles.find((role) => role.fitType === "primary") || analysis.roles[0];
  const others = analysis.roles.filter((role) => role !== primary);
  return (
    <Box sx={{ my: 4 }}>
      <Typography variant="h5" sx={{ fontWeight: 800, color: colors.ink, mb: 2 }}>{t("Your role map")}</Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(240px, .8fr) minmax(0, 1.8fr)" }, gap: 2 }}>
        <Paper elevation={0} sx={{ p: 3, borderRadius: 5, color: COLORS.onAccent, bgcolor: colors.primary, position: "relative", overflow: "hidden" }}>
          <Compass size={30} />
          <Typography sx={{ opacity: .75, mt: 4, fontSize: 12, fontWeight: 800, letterSpacing: ".08em" }}>{t("STRONGEST DIRECTION")}</Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, mt: .5 }}>{primary.title}</Typography>
          <Typography sx={{ opacity: .85, mt: 1 }}>{primary.summary}</Typography>
          <Typography sx={{ fontSize: 46, fontWeight: 800, mt: 2 }}>{primary.fitScore}<Box component="span" sx={{ fontSize: 16, opacity: .75 }}>/100</Box></Typography>
        </Paper>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 2 }}>
          {others.map((role) => (
            <Paper key={`${role.fitType}-${role.title}`} elevation={0} sx={{ p: 2.5, borderRadius: 4, border: "1px solid #dfe6e1", bgcolor: COLORS.bgWhite }}>
              <Stack direction="row" justifyContent="space-between" gap={1} alignItems="start">
                <Chip size="small" label={t(role.fitType)} sx={{ textTransform: "capitalize", bgcolor: role.fitType === "stretch" ? COLORS.accentOrangeSoft : COLORS.bgIconTinted, color: role.fitType === "stretch" ? colors.amber : colors.primary, fontWeight: 800 }} />
                <Typography sx={{ color: colors.primary, fontWeight: 800 }}>{t("Fit")} {role.fitScore}/100</Typography>
              </Stack>
              <Typography variant="h6" sx={{ fontWeight: 800, mt: 1.5 }}>{role.title}</Typography>
              <Typography sx={{ color: colors.muted, fontSize: 14, mt: .5 }}>{role.summary}</Typography>
              <Typography sx={{ fontSize: 12, color: colors.muted, mt: 2, fontWeight: 800 }}>{t("WHY IT FITS")}</Typography>
              {role.cvEvidence.slice(0, 2).map((item) => <Typography key={item} sx={{ fontSize: 13, mt: .5 }}>"{item}"</Typography>)}
            </Paper>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

const Recommendations = ({ analysis }: { analysis: RoleDiscovery | VacancyMatch }) => {
  const { t } = useTranslation();
  if (!analysis.recommendations.length) return null;
  return (
    <Box sx={{ mt: 4 }}>
      <Stack direction="row" gap={1} alignItems="center" mb={2}><Sparkles size={20} color={colors.primary} /><Typography variant="h5" sx={{ fontWeight: 800 }}>{t("Evidence-backed next steps")}</Typography></Stack>
      <Stack spacing={1.5}>
        {analysis.recommendations.map((item, index) => (
          <Paper key={`${index}-${item.action}`} elevation={0} sx={{ p: 2.5, border: "1px solid #dfe6e1", borderRadius: 3 }}>
            <Typography sx={{ fontWeight: 800 }}>{item.action}</Typography>
            <Evidence cv={item.evidence.cvExcerpt} requirement={"jobRequirement" in item.evidence ? item.evidence.jobRequirement : undefined} rationale={item.evidence.rationale} />
          </Paper>
        ))}
      </Stack>
    </Box>
  );
};

const DiscoveryResults = ({ analysis, result }: { analysis: RoleDiscovery; result: CareerMatchResponse }) => {
  const { t, i18n } = useTranslation();
  return (
    <>
      <Stack direction={{ xs: "column", sm: "row" }} gap={2} alignItems={{ sm: "center" }} justifyContent="space-between">
        <Box><Typography variant="overline" sx={{ color: colors.primary, fontWeight: 900 }}>{t("Role discovery")}</Typography><Typography variant="h4" sx={{ fontWeight: 850 }}>{analysis.inferredProfile}</Typography></Box>
        <Score label="CV Quality Score" value={analysis.cvQualityScore} />
      </Stack>
      <RoleMap analysis={analysis} />
      {result.marketSnapshot && (
        <Box sx={{ mt: 4 }}>
          <Stack direction="row" gap={1} alignItems="center" mb={2}><SearchCheck size={20} color={colors.primary} /><Typography variant="h5" sx={{ fontWeight: 800 }}>{t("Live market signals")}</Typography></Stack>
          <Typography sx={{ color: colors.muted, mb: 2, fontSize: 14 }}>{t("Searched")} {new Date(result.marketSnapshot.searchedAt).toLocaleString(i18n.language)}. {t("These signals come from the live web, not the older jobs database.")}</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" }, gap: 2 }}>
            {result.marketSnapshot.signals.map((signal) => (
              <Paper key={signal.roleTitle} elevation={0} sx={{ p: 2.5, borderRadius: 3, bgcolor: colors.sand }}>
                <Stack direction="row" justifyContent="space-between" gap={1}><Typography sx={{ fontWeight: 800 }}>{signal.roleTitle}</Typography><Chip size="small" label={t(signal.demand)} sx={{ fontWeight: 800, textTransform: "capitalize" }} /></Stack>
                <Typography sx={{ color: colors.muted, fontSize: 14, my: 1.5 }}>{signal.summary}</Typography>
                {signal.sources.map((source) => <Link key={source.url} href={source.url} target="_blank" rel="noreferrer" sx={{ display: "flex", gap: .5, alignItems: "center", fontSize: 13, color: colors.primary, mb: .75 }}>{source.title}<ArrowUpRight size={13} /></Link>)}
              </Paper>
            ))}
          </Box>
        </Box>
      )}
      <Recommendations analysis={analysis} />
    </>
  );
};

const RequirementList = ({ title, items, tone }: { title: string; items: VacancyMatch["matchedRequirements"]; tone: string }) => {
  const { t } = useTranslation();
  return (
    <Box>
      <Typography sx={{ fontWeight: 800, color: tone, mb: 1 }}>{t(title)} ({items.length})</Typography>
      <Stack spacing={1}>
        {items.map((item, index) => (
          <Paper key={`${index}-${item.requirement}`} elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #e2e6e3" }}>
            <Typography sx={{ fontWeight: 700 }}>{item.requirement}</Typography>
            <Evidence cv={item.cvEvidence} rationale={item.explanation} />
          </Paper>
        ))}
      </Stack>
    </Box>
  );
};

const VacancyScoreBreakdown = ({ analysis }: { analysis: VacancyMatch }) => {
  const { t } = useTranslation();
  const breakdown = analysis.matchBreakdown;
  const totalRequirements = analysis.matchedRequirements.length + analysis.partialRequirements.length + analysis.missingRequirements.length;
  const scores = [
    ["Requirement evidence points", breakdown.requirementsMatch, 45],
    ["Relevant experience", breakdown.relevantExperience, 25],
    ["Demonstrated skills", breakdown.demonstratedSkills, 20],
    ["Evidence quality", breakdown.evidenceQuality, 10],
  ] as const;
  return (
    <Paper elevation={0} sx={{ mt: 3, p: 2.5, borderRadius: 3, bgcolor: COLORS.surfaceSubtle }}>
      <Typography sx={{ fontWeight: 850, mb: 1.5 }}>{t("How this score was calculated")}</Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 2 }}>
        {scores.map(([label, value, maximum]) => <Box key={label}><Typography sx={{ color: colors.muted, fontSize: 12 }}>{t(label)}</Typography><Typography sx={{ color: colors.ink, fontWeight: 850, fontSize: 20 }}>{value}/{maximum}</Typography></Box>)}
      </Box>
      <Typography sx={{ color: colors.muted, fontSize: 13, mt: 2 }}>
        {t("{{count}} requirements assessed: {{matched}} matched, {{partial}} partial, {{missing}} not evidenced.", {
          count: totalRequirements,
          matched: analysis.matchedRequirements.length,
          partial: analysis.partialRequirements.length,
          missing: analysis.missingRequirements.length,
        })}
      </Typography>
    </Paper>
  );
};

const VacancyResults = ({ analysis }: { analysis: VacancyMatch }) => {
  const { t } = useTranslation();
  const hasPartials = analysis.partialRequirements && analysis.partialRequirements.length > 0;

  return (
    <>
      <Stack direction={{ xs: "column", md: "row" }} gap={2} justifyContent="space-between">
        <Box sx={{ maxWidth: 700 }}><Typography variant="overline" sx={{ color: colors.primary, fontWeight: 900 }}>{t("Vacancy match")}</Typography><Typography variant="h4" sx={{ fontWeight: 850 }}>{analysis.inferredJobTitle}</Typography><Typography sx={{ color: colors.muted, mt: 1 }}>{analysis.summary}</Typography></Box>
        <Stack direction="row" gap={1.5}><Score label="CV Quality" value={analysis.cvQualityScore} /><Score label="Job requirement match" value={analysis.jobMatchScore} /></Stack>
      </Stack>
      <Stack direction="row" gap={1} mt={2} alignItems="center" flexWrap="wrap">
        <Chip label={t(vacancyScoreLabels[analysis.scoreLabel])} sx={{ fontWeight: 800, textTransform: "capitalize" }} />
        <Chip label={`${t("Screening risk")}: ${t(analysis.screeningRisk)}`} variant="outlined" sx={{ fontWeight: 700, textTransform: "capitalize" }} />
      </Stack>
      <VacancyScoreBreakdown analysis={analysis} />
      {analysis.matchedRequirements.length > 0 && (
        <Paper elevation={0} sx={{ mt: 3, p: 2.5, borderRadius: 3, bgcolor: COLORS.bgIconTinted, border: `1px solid ${colors.primary}` }}>
          <Typography sx={{ color: colors.primary, fontWeight: 850, mb: 1 }}>{t("Strong matches in your CV")}</Typography>
          {analysis.matchedRequirements.slice(0, 4).map((item) => <Typography key={item.requirement} sx={{ color: colors.ink, fontSize: 14, mt: .5 }}>• {item.requirement}</Typography>)}
        </Paper>
      )}
      <Box sx={{ display: "grid", gridTemplateColumns: hasPartials ? { xs: "1fr", lg: "repeat(2, 1fr)" } : "1fr", gap: 3, mt: 4 }}>
        <RequirementList title="Matched requirements" items={analysis.matchedRequirements} tone={colors.primary} />
        {hasPartials && <RequirementList title="Partial requirements" items={analysis.partialRequirements} tone={colors.amber} />}
      </Box>
      {analysis.missingRequirements.length > 0 && <Paper elevation={0} sx={{ mt: 3, p: 2.5, borderRadius: 3, bgcolor: COLORS.accentOrangeSoft }}><Typography sx={{ fontWeight: 800, color: colors.amber, mb: 1 }}>{t("Not evidenced in the CV")} ({analysis.missingRequirements.length})</Typography>{analysis.missingRequirements.map((item) => <Box key={item.requirement} sx={{ mb: 1.5 }}><Stack direction="row" gap={1} alignItems="center"><Typography sx={{ fontWeight: 700 }}>{item.requirement}</Typography><Chip size="small" label={t(item.priority === "must_have" ? "Must-have" : "Preferred")} /></Stack><Typography sx={{ color: colors.muted, fontSize: 14 }}>{item.explanation}</Typography></Box>)}</Paper>}
      {analysis.reviewNeededRequirements.length > 0 && (
        <Paper elevation={0} sx={{ mt: 3, p: 3, borderRadius: 3.5, bgcolor: COLORS.warningSoft, border: "1px solid #f2e2c6" }}>
          <Stack direction="row" gap={1} alignItems="center" mb={1}>
            <Sparkles size={20} color={colors.amber} />
            <Typography sx={{ fontWeight: 850, color: colors.ink, fontSize: 16 }}>
              {t("Requires Your Review & Context")}
            </Typography>
          </Stack>
          <Typography sx={{ color: colors.muted, fontSize: 14, mb: 2 }}>
            {t("We detected these requirements in the job posting, but could not automatically verify exact verbatim evidence from your CV text. Review them to ensure your CV mentions them explicitly:")}
          </Typography>
          <Stack spacing={1.5}>
            {analysis.reviewNeededRequirements.map((item, idx) => (
              <Paper key={idx} elevation={0} sx={{ p: 2, borderRadius: 2.5, bgcolor: COLORS.bgWhite, border: "1px solid #eadbbf" }}>
                <Typography sx={{ fontWeight: 800, color: colors.ink }}>{item.requirement}</Typography>
                <Typography sx={{ color: colors.muted, fontSize: 13, mt: 0.5 }}>{item.note}</Typography>
              </Paper>
            ))}
          </Stack>
        </Paper>
      )}
      <CareerRoadmap analysis={analysis} />
      {analysis.alternativeRoles.length > 0 && <Stack direction="row" gap={1} flexWrap="wrap" mt={3} alignItems="center"><Target size={18} /><Typography sx={{ fontWeight: 800 }}>{t("Also consider:")}</Typography>{analysis.alternativeRoles.map((role) => <Chip key={role} label={role} />)}</Stack>}
    </>
  );
};

export default function CareerMatchResults({ result }: { result: CareerMatchResponse }) {
  const { t } = useTranslation();
  return <Paper elevation={0} sx={{ p: { xs: 2.5, md: 5 }, borderRadius: 5, bgcolor: COLORS.bgWhite, border: "1px solid #dfe6e1" }}>
    <Stack direction="row" gap={1} alignItems="center" mb={3}><CheckCircle2 size={18} color={colors.primary} /><Typography sx={{ fontSize: 13, color: colors.muted }}>{result.cached ? t("Loaded from your private 7-day cache — no new live search used.") : t("New analysis completed.")}</Typography></Stack>
    <Divider sx={{ mb: 3 }} />
    {result.analysis.mode === "role_discovery" ? <DiscoveryResults analysis={result.analysis} result={result} /> : <VacancyResults analysis={result.analysis} />}
    <Typography sx={{ color: colors.muted, fontSize: 12, mt: 4 }}>
      {result.analysis.mode === "vacancy_match"
        ? t("Job requirement scores are calculated from evidence found in the supplied CV and vacancy. They are not hiring predictions or guarantees.")
        : t("Scores are AI estimates based on the documents provided. They are not real ATS scores, hiring predictions, or guarantees.")}
    </Typography>
  </Paper>;
}
