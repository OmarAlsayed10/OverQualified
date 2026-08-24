import { Box, Button, Chip, Paper, Typography } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import { useTranslation } from "react-i18next";
import interviewCoach from "./interviewCoach.tokens";
import { InterviewSession } from "./interviewCoach.types";

interface InterviewHistoryProps {
  sessions: InterviewSession[];
  selectedId: string | null;
  onSelect: (session: InterviewSession) => void;
  onNew: () => void;
}

const InterviewHistory = ({ sessions, selectedId, onSelect, onNew }: InterviewHistoryProps) => {
  const { t, i18n } = useTranslation();
  const dateFormatter = new Intl.DateTimeFormat(i18n.language, { month: "short", day: "numeric" });

  return (
    <Paper component="aside" elevation={0} sx={{ ...interviewCoach.paper, ...interviewCoach.history }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <HistoryRoundedIcon color="primary" fontSize="small" />
          <Typography fontWeight={900}>{t("Practice history")}</Typography>
        </Box>
        <Button size="small" startIcon={<AddRoundedIcon />} onClick={onNew} sx={{ textTransform: "none" }}>
          {t("New")}
        </Button>
      </Box>
      {sessions.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t("Your saved interview sessions will appear here.")}
        </Typography>
      ) : (
        <Box sx={{ display: "grid", gap: 1.25 }}>
          {sessions.map((session) => (
            <Box
              component="button"
              type="button"
              key={session.id}
              onClick={() => onSelect(session)}
              sx={interviewCoach.historyItem(session.id === selectedId)}
            >
              <Typography fontWeight={800} noWrap>{session.targetRole}</Typography>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, mt: 0.75 }}>
                <Typography variant="caption" color="text.secondary">
                  {dateFormatter.format(new Date(session.updatedAt))}
                </Typography>
                <Chip
                  size="small"
                  label={session.status === "completed"
                    ? t("Complete")
                    : session.status === "quit" ? t("Quit") : t("In progress")}
                  color={session.status === "completed" ? "success" : "default"}
                />
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  );
};

export default InterviewHistory;
