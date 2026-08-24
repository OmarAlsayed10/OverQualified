import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import FlagRoundedIcon from "@mui/icons-material/FlagRounded";
import TimerOutlinedIcon from "@mui/icons-material/TimerOutlined";
import { useTranslation } from "react-i18next";
import interviewCoach from "./interviewCoach.tokens";
import { InterviewFeedbackStrength, InterviewSession } from "./interviewCoach.types";
import { formattedInterviewTime, useInterviewTimer } from "./useInterviewTimer";

interface InterviewSessionViewProps {
  session: InterviewSession;
  answer: string;
  submitting: boolean;
  finishing: boolean;
  onAnswerChange: (answer: string) => void;
  onSubmit: () => void;
  onFinish: () => void;
}

const FeedbackList = ({ title, entries }: { title: string; entries: string[] }) => {
  if (entries.length === 0) return null;
  return (
    <Box>
      <Typography fontWeight={800} mb={0.5}>{title}</Typography>
      <Box component="ul" sx={{ m: 0, paddingInlineStart: 2.5 }}>
        {entries.map((entry) => <Typography component="li" key={entry}>{entry}</Typography>)}
      </Box>
    </Box>
  );
};

const StrengthList = ({ title, entries }: { title: string; entries: InterviewFeedbackStrength[] }) => {
  if (entries.length === 0) return null;
  return (
    <Box>
      <Typography fontWeight={800} mb={0.5}>{title}</Typography>
      <Box component="ul" sx={{ m: 0, paddingInlineStart: 2.5 }}>
        {entries.map((entry) => (
          <Typography component="li" key={`${entry.feedback}-${entry.evidenceExcerpt}`}>
            {entry.feedback}
          </Typography>
        ))}
      </Box>
    </Box>
  );
};

const InterviewSessionView = ({
  session,
  answer,
  submitting,
  finishing,
  onAnswerChange,
  onSubmit,
  onFinish,
}: InterviewSessionViewProps) => {
  const { t, i18n } = useTranslation();
  const [finishDialogOpen, setFinishDialogOpen] = useState(false);
  const remainingSeconds = useInterviewTimer(session, submitting || finishing);
  const questionNumber = session.turns.length + 1;
  const latestFeedback = session.turns.at(-1)?.feedback;
  const timeExpired = remainingSeconds === 0;
  const lastQuestion = questionNumber >= session.questionLimit || timeExpired;

  return (
    <Paper elevation={0} sx={{ ...interviewCoach.paper, ...interviewCoach.session }}>
      <Box sx={interviewCoach.progressTrack(session.questionLimit)} aria-label={t("Interview progress")}>
        {Array.from({ length: session.questionLimit }, (_, index) => index + 1).map((step) => (
          <Box
            key={step}
            sx={interviewCoach.progressStep(step <= session.turns.length, step === questionNumber)}
          />
        ))}
      </Box>

      {latestFeedback && (
        <Box sx={interviewCoach.feedback} role="status">
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5, flexWrap: "wrap" }}>
            <AutoAwesomeRoundedIcon sx={{ color: "primary.main" }} />
            <Typography fontWeight={900}>{t("Coach notes")}</Typography>
            <Chip size="small" label={`${latestFeedback.score}/5`} color="success" />
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
            <StrengthList title={t("What worked")} entries={latestFeedback.strengths} />
            <FeedbackList title={t("Improve next time")} entries={latestFeedback.improvements} />
          </Box>
        </Box>
      )}

      <Box sx={{ mt: latestFeedback ? 4 : 0 }}>
        <Box sx={interviewCoach.sessionMeta}>
          <Typography sx={interviewCoach.questionLabel}>
            {t("Question {{current}} of {{total}}", {
              current: questionNumber,
              total: session.questionLimit,
            })}
          </Typography>
          {remainingSeconds !== null && (
            <Box sx={interviewCoach.timer(remainingSeconds)} role="timer">
              <TimerOutlinedIcon sx={{ fontSize: 17, verticalAlign: "text-bottom", me: 0.75 }} />
              {formattedInterviewTime(remainingSeconds)}
            </Box>
          )}
        </Box>
        {remainingSeconds !== null && remainingSeconds > 0 && remainingSeconds <= 300 && (
          <Typography color={remainingSeconds <= 60 ? "error" : "warning.main"} fontWeight={800} mb={2} role="status">
            {remainingSeconds <= 60
              ? t("Less than one minute remaining.")
              : t("Less than five minutes remaining.")}
          </Typography>
        )}
        {timeExpired && (
          <Typography color="error" fontWeight={800} mb={2} role="status">
            {t("Time is up. Submit your current answer to finish the interview.")}
          </Typography>
        )}
        <Typography component="h2" sx={interviewCoach.question}>
          {session.currentQuestion}
        </Typography>
        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={7}
          value={answer}
          onChange={(event) => onAnswerChange(event.target.value)}
          label={t("Your answer")}
          placeholder={t("Answer as you would in the real interview...")}
          inputProps={{ maxLength: 5000 }}
          sx={interviewCoach.answer}
        />
        <Box sx={interviewCoach.actionRow}>
          <Typography variant="body2" color="text.secondary">
            {submitting
              ? t("Timer paused while the coach prepares your next question.")
              : t("Use only details you can defend in a real interview.")}
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {session.turns.length >= 3 && !timeExpired && (
              <Button
                variant="outlined"
                startIcon={finishing ? <CircularProgress size={17} /> : <FlagRoundedIcon />}
                onClick={() => setFinishDialogOpen(true)}
                disabled={submitting || finishing}
                sx={{ textTransform: "none" }}
              >
                {t("Finish early")}
              </Button>
            )}
            <Button
              variant="contained"
              endIcon={submitting ? <CircularProgress size={17} color="inherit" /> : <ArrowForwardRoundedIcon sx={{ transform: i18n.dir() === "rtl" ? "rotate(180deg)" : "none" }} />}
              onClick={onSubmit}
              disabled={submitting || finishing || !answer.trim()}
              sx={interviewCoach.primaryButton}
            >
              {lastQuestion ? t("Finish interview") : t("Submit answer")}
            </Button>
          </Box>
        </Box>
      </Box>

      {session.turns.length > 0 && (
        <>
          <Divider sx={{ my: 4 }} />
          <Typography variant="h6" fontWeight={900}>{t("Interview transcript")}</Typography>
          <Box sx={interviewCoach.transcript}>
            {session.turns.map((turn, index) => (
              <Box key={`${index}-${turn.question}`} sx={interviewCoach.turn}>
                <Typography variant="overline" color="primary" fontWeight={800} sx={interviewCoach.turnLabel}>
                  {t("Question {{number}}", { number: index + 1 })}
                </Typography>
                <Typography sx={interviewCoach.turnQuestion}>{turn.question}</Typography>
                <Box sx={interviewCoach.turnAnswer}>
                  <Typography variant="caption" color="text.secondary" fontWeight={800}>
                    {t("Your answer")}
                  </Typography>
                  <Typography color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>{turn.answer}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </>
      )}

      <Dialog open={finishDialogOpen} onClose={() => setFinishDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t("Finish this interview early?")}</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            {t("The coach will create your report from the answers completed so far.")}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFinishDialogOpen(false)}>{t("Continue interview")}</Button>
          <Button
            variant="contained"
            onClick={() => {
              setFinishDialogOpen(false);
              onFinish();
            }}
            sx={interviewCoach.primaryButton}
          >
            {t("Finish and create report")}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default InterviewSessionView;
