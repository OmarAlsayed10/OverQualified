import { Box, Button, Chip, Divider, Paper, Typography } from "@mui/material";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import { useTranslation } from "react-i18next";
import interviewCoach from "./interviewCoach.tokens";
import { InterviewReportFinding, InterviewSession } from "./interviewCoach.types";

interface InterviewReportViewProps {
  session: InterviewSession;
  onNewInterview: () => void;
}

const ReportList = ({ title, entries }: { title: string; entries: InterviewReportFinding[] }) => (
  <Box>
    <Typography variant="h6" fontWeight={900} mb={1}>{title}</Typography>
    <Box component="ul" sx={{ m: 0, ps: 2.5, display: "grid", gap: 1.5 }}>
      {entries.map((entry) => (
        <Box component="li" key={`${entry.feedback}-${entry.evidenceExcerpt}`}>
          <Typography>{entry.feedback}</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.35}>“{entry.evidenceExcerpt}”</Typography>
        </Box>
      ))}
    </Box>
  </Box>
);

const SimpleList = ({ title, entries }: { title: string; entries: string[] }) => (
  <Box>
    <Typography variant="h6" fontWeight={900} mb={1}>{title}</Typography>
    <Box component="ul" sx={{ m: 0, ps: 2.5, display: "grid", gap: 0.75 }}>
      {entries.map((entry) => <Typography component="li" key={entry}>{entry}</Typography>)}
    </Box>
  </Box>
);

const InterviewReportView = ({ session, onNewInterview }: InterviewReportViewProps) => {
  const { t } = useTranslation();
  const report = session.report!;
  const answerWords = session.turns.reduce(
    (total, turn) => total + turn.answer.trim().split(/\s+/u).filter(Boolean).length,
    0,
  );
  const averageWords = Math.round(answerWords / Math.max(1, session.turns.length));
  const timeUsedMinutes = session.durationMinutes === null || session.remainingSeconds === null
    ? null
    : Math.ceil((session.durationMinutes * 60 - session.remainingSeconds) / 60);

  return (
    <Paper elevation={0} sx={{ ...interviewCoach.paper, ...interviewCoach.session }}>
      <Box sx={interviewCoach.reportHeader}>
        <Box>
          <Typography sx={interviewCoach.eyebrow}>{t("Interview complete")}</Typography>
          <Typography component="h2" variant="h4" fontWeight={900} mt={0.75}>
            {session.targetRole}
          </Typography>
          <Typography color="text.secondary" mt={1}>{t("Your report links every finding to your interview answers.")}</Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 2 }}>
            <Chip label={t("{{count}} questions answered", { count: session.turns.length })} />
            <Chip label={t("{{count}} average words", { count: averageWords })} />
            {timeUsedMinutes !== null && (
              <Chip label={t("{{minutes}} minutes used", { minutes: timeUsedMinutes })} />
            )}
          </Box>
        </Box>
        <Box sx={interviewCoach.score} aria-label={t("Overall score: {{score}} out of 100", { score: report.overallScore })}>
          {report.overallScore}
        </Box>
      </Box>
      <Divider sx={{ my: 3 }} />
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 4 }}>
        <ReportList title={t("Strengths")} entries={report.strengths} />
        <ReportList title={t("Areas to improve")} entries={report.improvements} />
      </Box>
      <Divider sx={{ my: 3 }} />
      <SimpleList title={t("Practice next")} entries={report.practiceNext} />
      {report.topicsNotReached.length > 0 && (
        <Box mt={3}>
          <SimpleList title={t("Topics not reached")} entries={report.topicsNotReached} />
        </Box>
      )}
      <Box mt={4}>
        <Button
          variant="contained"
          startIcon={<ReplayRoundedIcon />}
          onClick={onNewInterview}
          sx={interviewCoach.primaryButton}
        >
          {t("Practice another interview")}
        </Button>
      </Box>
    </Paper>
  );
};

export default InterviewReportView;
