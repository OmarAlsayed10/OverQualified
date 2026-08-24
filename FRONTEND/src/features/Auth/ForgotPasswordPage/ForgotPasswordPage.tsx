import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Link,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { AUTH_ENDPOINTS } from "../../../constants/endpoints";
import loginPage from "../LoginPage/loginPage.tokens";

const ForgotPasswordPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [step, setStep] = useState<"request" | "confirm">("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError(t("Email is required."));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.post(AUTH_ENDPOINTS.forgotPassword, {
        email: email.trim(),
      });
      setNotice(data.message);
      setStep("confirm");
    } catch {
      setError(t("Could not send the reset code. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const submitConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || !password) {
      setError(t("Code and new password are required."));
      return;
    }
    setLoading(true);
    setError("");
    try {
      await axios.post(AUTH_ENDPOINTS.resetPassword, {
        email: email.trim(),
        otp: otp.trim(),
        password,
      });
      navigate("/login");
    } catch (err: any) {
      setError(
        err.response?.data?.message ?? t("Could not reset the password. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth={false} sx={loginPage.root}>
      <title>Reset your password | OverQualified</title>
      <meta name="robots" content="noindex" />

      <Box sx={loginPage.homeLink}>
        <Link component={RouterLink} to="/" sx={loginPage.homeLinkColor}>
          <HomeIcon sx={{ fontSize: 32 }} />
        </Link>
      </Box>

      <Paper elevation={0} sx={loginPage.paper}>
        <Typography variant="h4" sx={loginPage.title}>
          {t("Reset Your Password")}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ borderRadius: "8px" }}>
            {error}
          </Alert>
        )}
        {notice && (
          <Alert severity="info" sx={{ borderRadius: "8px" }}>
            {notice}
          </Alert>
        )}

        {step === "request" ? (
          <Box
            component="form"
            onSubmit={submitRequest}
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <TextField
              label={t("Email")}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              fullWidth
              size="small"
              autoComplete="email"
            />
            <Button type="submit" variant="contained" disabled={loading} sx={loginPage.button}>
              {loading ? <CircularProgress size={20} /> : t("Send Reset Code")}
            </Button>
          </Box>
        ) : (
          <Box
            component="form"
            onSubmit={submitConfirm}
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <TextField
              label={t("Reset Code")}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              disabled={loading}
              fullWidth
              size="small"
              inputProps={{ inputMode: "numeric", maxLength: 6 }}
              autoComplete="one-time-code"
            />
            <TextField
              label={t("New Password")}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              fullWidth
              size="small"
              autoComplete="new-password"
              helperText={t("At least 8 characters.")}
            />
            <Button type="submit" variant="contained" disabled={loading} sx={loginPage.button}>
              {loading ? <CircularProgress size={20} /> : t("Set New Password")}
            </Button>
          </Box>
        )}

        <Typography sx={loginPage.helperText}>
          <Link component={RouterLink} to="/login" sx={loginPage.link}>
            {t("Back to login")}
          </Link>
        </Typography>
      </Paper>
    </Container>
  );
};

export default ForgotPasswordPage;
