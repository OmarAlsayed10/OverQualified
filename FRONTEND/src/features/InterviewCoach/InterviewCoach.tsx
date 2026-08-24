import { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Button, CircularProgress, Container, Typography } from "@mui/material";
import ForumRoundedIcon from "@mui/icons-material/ForumRounded";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { AI_ENDPOINTS, CV_ENDPOINTS, INTERVIEW_COACH_ENDPOINTS } from "../../constants/endpoints";
import { useFeedback } from "../../context/FeedbackContext";
import InterviewHistory from "./InterviewHistory";
import InterviewReportView from "./InterviewReportView";
import InterviewSessionView from "./InterviewSessionView";
import InterviewSetup from "./InterviewSetup";
import interviewCoach from "./interviewCoach.tokens";
import { roleSuggestionsFromCv } from "./roleSuggestions";
import {
  InterviewCvData,
  InterviewSession,
  InterviewSetupValues,
  SavedCvOption,
} from "./interviewCoach.types";

const emptySetup: InterviewSetupValues = {
  source: "saved",
  cvId: "",
  uploadedCv: null,
  targetRole: "",
  jobDescription: "",
  durationMinutes: null,
};

const InterviewCoach = () => {
  const { t, i18n } = useTranslation();
  const { notify, showEntitlement } = useFeedback();
  const [cvs, setCvs] = useState<SavedCvOption[]>([]);
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<InterviewSession | null>(null);
  const [setup, setSetup] = useState(emptySetup);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const selectedCv = useMemo(
    () => setup.source === "saved"
      ? cvs.find((cv) => cv.id === setup.cvId)
      : setup.uploadedCv?.formData,
    [cvs, setup.cvId, setup.source, setup.uploadedCv],
  );
  const roleSuggestions = useMemo(() => roleSuggestionsFromCv(selectedCv), [selectedCv]);

  const requestError = useCallback((error: unknown, fallback: string) => {
    const code = axios.isAxiosError(error) ? error.response?.data?.code : undefined;
    if (code === "CREDITS_EXHAUSTED" || code === "IP_LIMIT_REACHED") {
      showEntitlement("CREDITS_EXHAUSTED");
      return;
    }
    const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined;
    notify(typeof message === "string" ? message : t(fallback));
  }, [notify, showEntitlement, t]);

  useEffect(() => {
    const load = async () => {
      try {
        const [cvResponse, sessionResponse] = await Promise.all([
          axios.get(CV_ENDPOINTS.userCvs, { withCredentials: true }),
          axios.get(INTERVIEW_COACH_ENDPOINTS.sessions, { withCredentials: true }),
        ]);
        const savedCvs: SavedCvOption[] = Array.isArray(cvResponse.data) ? cvResponse.data : [];
        setCvs(savedCvs);
        setSessions(sessionResponse.data.sessions ?? []);
        const preferredCv = savedCvs.find((cv) => cv.isPrimary) ?? savedCvs[0];
        const suggestedRole = roleSuggestionsFromCv(preferredCv)[0] ?? "";
        setSetup((current) => ({
          ...current,
          source: preferredCv ? "saved" : "upload",
          cvId: preferredCv?.id ?? "",
          targetRole: suggestedRole,
        }));
      } catch (error) {
        requestError(error, "Could not load interview practice.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [requestError]);

  const changeSetup = (nextSetup: InterviewSetupValues) => {
    const sourceChanged = nextSetup.source !== setup.source
      || nextSetup.cvId !== setup.cvId
      || nextSetup.uploadedCv !== setup.uploadedCv;
    if (!sourceChanged) {
      setSetup(nextSetup);
      return;
    }
    const nextCv = nextSetup.source === "saved"
      ? cvs.find((cv) => cv.id === nextSetup.cvId)
      : nextSetup.uploadedCv?.formData;
    setSetup({ ...nextSetup, targetRole: roleSuggestionsFromCv(nextCv)[0] ?? "" });
  };

  const uploadCv = async (file: File) => {
    setUploading(true);
    const upload = new FormData();
    upload.append("cv", file);
    try {
      const response = await axios.post(AI_ENDPOINTS.importCv, upload, { withCredentials: true });
      const formData = response.data.formData as InterviewCvData;
      setSetup((current) => ({
        ...current,
        source: "upload",
        uploadedCv: { fileName: file.name, formData },
        targetRole: roleSuggestionsFromCv(formData)[0] ?? "",
      }));
    } catch (error) {
      requestError(error, "We could not import that CV. Please use a PDF or Word file.");
    } finally {
      setUploading(false);
    }
  };

  const replaceSession = (session: InterviewSession) => {
    setSelectedSession(session);
    setSessions((current) => [session, ...current.filter((entry) => entry.id !== session.id)]);
  };

  const startInterview = async () => {
    setStarting(true);
    const cvSource = setup.source === "saved"
      ? { cvId: setup.cvId }
      : { uploadedCv: setup.uploadedCv };
    try {
      const response = await axios.post(
        INTERVIEW_COACH_ENDPOINTS.sessions,
        {
          ...cvSource,
          targetRole: setup.targetRole,
          jobDescription: setup.jobDescription,
          durationMinutes: setup.durationMinutes,
          language: i18n.language === "ar" ? "ar" : "en",
        },
        { withCredentials: true },
      );
      replaceSession(response.data.session);
      setAnswer("");
    } catch (error) {
      requestError(error, "Could not start the interview.");
    } finally {
      setStarting(false);
    }
  };

  const submitAnswer = async () => {
    if (!selectedSession || !answer.trim()) return;
    setSubmitting(true);
    try {
      const response = await axios.post(
        INTERVIEW_COACH_ENDPOINTS.answers(selectedSession.id),
        { answer: answer.trim() },
        { withCredentials: true },
      );
      replaceSession(response.data.session);
      setAnswer("");
    } catch (error) {
      requestError(error, "Could not submit your answer.");
    } finally {
      setSubmitting(false);
    }
  };

  const finishInterview = async () => {
    if (!selectedSession) return;
    setFinishing(true);
    try {
      const response = await axios.post(
        INTERVIEW_COACH_ENDPOINTS.finish(selectedSession.id),
        {},
        { withCredentials: true },
      );
      replaceSession(response.data.session);
    } catch (error) {
      requestError(error, "Could not finish the interview.");
    } finally {
      setFinishing(false);
    }
  };

  const newInterview = () => {
    setSelectedSession(null);
    setAnswer("");
  };

  if (loading) {
    return <Box sx={{ display: "grid", placeItems: "center", minHeight: "65vh" }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={interviewCoach.page}>
      <Container maxWidth="xl">
        <Box sx={interviewCoach.header}>
          <Box>
            <Typography sx={interviewCoach.eyebrow}>{t("AI interview practice")}</Typography>
            <Typography component="h1" sx={interviewCoach.title}>{t("Practice the answer, not a performance.")}</Typography>
            <Typography sx={interviewCoach.subtitle}>
              {t("Role-specific questions grounded in your CV, with practical feedback and no invented claims.")}
            </Typography>
          </Box>
          {selectedSession && (
            <Button startIcon={<ForumRoundedIcon />} onClick={newInterview} variant="outlined">
              {t("New interview")}
            </Button>
          )}
        </Box>

        <Box sx={interviewCoach.layout}>
          {selectedSession?.status === "completed" && selectedSession.report ? (
            <InterviewReportView session={selectedSession} onNewInterview={newInterview} />
          ) : selectedSession ? (
            <InterviewSessionView
              session={selectedSession}
              answer={answer}
              submitting={submitting}
              finishing={finishing}
              onAnswerChange={setAnswer}
              onSubmit={submitAnswer}
              onFinish={finishInterview}
            />
          ) : (
            <InterviewSetup
              cvs={cvs}
              values={setup}
              roleSuggestions={roleSuggestions}
              loading={starting}
              uploading={uploading}
              onChange={changeSetup}
              onUpload={uploadCv}
              onStart={startInterview}
            />
          )}
          <InterviewHistory
            sessions={sessions}
            selectedId={selectedSession?.id ?? null}
            onSelect={(session) => { setSelectedSession(session); setAnswer(""); }}
            onNew={newInterview}
          />
        </Box>
      </Container>
    </Box>
  );
};

export default InterviewCoach;
