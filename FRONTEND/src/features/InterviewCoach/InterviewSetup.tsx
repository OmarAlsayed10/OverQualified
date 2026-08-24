import { useRef } from "react";
import {
  Autocomplete,
  Box,
  Button,
  MenuItem,
  Paper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import { useTranslation } from "react-i18next";
import interviewCoach from "./interviewCoach.tokens";
import { InterviewSetupValues, SavedCvOption } from "./interviewCoach.types";

interface InterviewSetupProps {
  cvs: SavedCvOption[];
  values: InterviewSetupValues;
  roleSuggestions: string[];
  loading: boolean;
  uploading: boolean;
  onChange: (values: InterviewSetupValues) => void;
  onUpload: (file: File) => void;
  onStart: () => void;
}

const durationOptions = [null, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60] as const;

const InterviewSetup = ({
  cvs,
  values,
  roleSuggestions,
  loading,
  uploading,
  onChange,
  onUpload,
  onStart,
}: InterviewSetupProps) => {
  const { t } = useTranslation();
  const fileInput = useRef<HTMLInputElement>(null);
  const setValues = (nextValues: Partial<InterviewSetupValues>) => onChange({ ...values, ...nextValues });
  const sourceReady = values.source === "saved" ? Boolean(values.cvId) : Boolean(values.uploadedCv);

  return (
    <Paper elevation={0} sx={{ ...interviewCoach.paper, ...interviewCoach.setup }}>
      <Typography variant="h5" fontWeight={800} mb={0.75}>
        {t("Set up your interview")}
      </Typography>
      <Typography color="text.secondary" mb={3}>
        {t("Choose the evidence your coach should use. Your answers remain yours and are never rewritten as facts.")}
      </Typography>
      <Box sx={{ display: "grid", gap: 2.5 }}>
        <ToggleButtonGroup
          exclusive
          value={values.source}
          onChange={(_, source) => source && setValues({ source })}
          aria-label={t("CV source")}
          fullWidth
          size="small"
        >
          <ToggleButton value="saved">{t("Saved CV")}</ToggleButton>
          <ToggleButton value="upload">{t("Upload CV")}</ToggleButton>
        </ToggleButtonGroup>

        {values.source === "saved" ? (
          <TextField
            select
            required
            fullWidth
            label={t("CV")}
            value={values.cvId}
            onChange={(event) => setValues({ cvId: event.target.value })}
            disabled={loading || cvs.length === 0}
          >
            {cvs.map((cv) => (
              <MenuItem key={cv.id} value={cv.id}>
                {cv.title || cv.personalInfo?.professionalTitle || t("Untitled CV")}
                {cv.isPrimary ? ` · ${t("Primary")}` : ""}
              </MenuItem>
            ))}
          </TextField>
        ) : (
          <Box sx={interviewCoach.uploadBox}>
            <input
              ref={fileInput}
              hidden
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onUpload(file);
                event.target.value = "";
              }}
            />
            <UploadFileRoundedIcon color="primary" />
            <Box sx={{ flex: 1 }}>
              <Typography fontWeight={800}>
                {values.uploadedCv?.fileName || t("Upload a PDF or Word CV")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {values.uploadedCv
                  ? t("CV ready for interview practice")
                  : t("PDF, DOC, or DOCX up to 5 MB. The original file is not stored.")}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t("Extracted CV content is saved with the interview session so you can resume it.")}
              </Typography>
            </Box>
            <Button
              variant="outlined"
              onClick={() => fileInput.current?.click()}
              disabled={uploading || loading}
              sx={{ textTransform: "none" }}
            >
              {uploading ? t("Reading CV...") : values.uploadedCv ? t("Replace") : t("Choose file")}
            </Button>
          </Box>
        )}

        <Autocomplete
          freeSolo
          options={roleSuggestions}
          value={values.targetRole}
          onChange={(_, role) => setValues({ targetRole: role || "" })}
          onInputChange={(_, role) => setValues({ targetRole: role })}
          renderInput={(params) => (
            <TextField
              {...params}
              required
              label={t("Target role")}
              helperText={roleSuggestions.length
                ? t("Select a role found in your CV or enter another role.")
                : t("Enter the role you want to practice for.")}
              inputProps={{ ...params.inputProps, maxLength: 150 }}
            />
          )}
        />

        <TextField
          select
          fullWidth
          label={t("Interview duration")}
          value={values.durationMinutes ?? "untimed"}
          onChange={(event) => setValues({
            durationMinutes: event.target.value === "untimed" ? null : Number(event.target.value),
          })}
          helperText={values.durationMinutes === null
            ? t("Untimed practice allows up to 8 questions.")
            : t("The timer pauses while the coach prepares the next question.")}
        >
          {durationOptions.map((minutes) => (
            <MenuItem key={minutes ?? "untimed"} value={minutes ?? "untimed"}>
              {minutes === null
                ? t("Untimed practice")
                : t("{{minutes}} minutes", { minutes })}
              {minutes === 30 ? ` · ${t("Recommended")}` : ""}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          fullWidth
          multiline
          minRows={5}
          label={t("Job description (optional)")}
          value={values.jobDescription}
          onChange={(event) => setValues({ jobDescription: event.target.value })}
          helperText={t("Paste a vacancy to make the questions more specific.")}
          inputProps={{ maxLength: 12000 }}
        />

        {values.source === "saved" && cvs.length === 0 && (
          <Typography color="text.secondary">
            {t("No saved CVs yet. Upload one here to start practicing.")}
          </Typography>
        )}
        <Box>
          <Button
            variant="contained"
            startIcon={<PlayArrowRoundedIcon />}
            onClick={onStart}
            disabled={loading || uploading || !sourceReady || !values.targetRole.trim()}
            sx={interviewCoach.primaryButton}
          >
            {loading ? t("Preparing interview...") : t("Start interview")}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default InterviewSetup;
