import {
  Box,
  Button,
  Typography,
  Container,
  Link,
  Paper,
  TextField,
  Divider,
  Alert,
  CircularProgress,
} from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import HomeIcon from "@mui/icons-material/Home";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import i18n from "../../../i18n";
import { useAuth } from "../../../hooks/useAuth";
import { AUTH_ENDPOINTS } from "../../../constants/endpoints";
import registerPage from "./registerPage.tokens";
import { identifyUser, track } from "../../../lib/analytics";

type Stage = "form" | "otp";

const RegisterPage = () => {
  const { t } = useTranslation();
  const currentLang = i18n.language;
  const { login } = useAuth();
  const navigate = useNavigate();

  const [stage, setStage] = useState<Stage>("form");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendMsg, setResendMsg] = useState("");

  const handleGoogleRegister = () => {
    window.location.href = AUTH_ENDPOINTS.google;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      setError(t("All fields are required."));
      return;
    }
    if (password.length < 8) {
      setError(t("Password must be at least 8 characters."));
      return;
    }
    setLoading(true);
    setError("");
    try {
      await axios.post(AUTH_ENDPOINTS.register, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
      });
      track("signup_started");
      setStage("otp");
    } catch (err: any) {
      setError(err.response?.data?.message ?? t("Registration failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      setError(t("Please enter the verification code."));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.post(
        AUTH_ENDPOINTS.verifyOTP,
        { email: email.trim(), otp: otp.trim() },
        { withCredentials: true }
      );
      if (data.user?.id) identifyUser(data.user.id);
      track("signup_completed");
      login(data.user);
      navigate(data.user?.onboarded ? "/" : "/onboarding");
    } catch (err: any) {
      setError(err.response?.data?.message ?? t("Invalid or expired code."));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setResendMsg("");
    setError("");
    try {
      await axios.post(AUTH_ENDPOINTS.resendOTP, { email: email.trim() });
      setResendMsg(t("A new code was sent to your email."));
    } catch {
      setError(t("Failed to resend code. Please try again."));
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <Container maxWidth={false} sx={registerPage.root}>
      <Box sx={registerPage.homeLink}>
        <Link component={RouterLink} to="/" sx={registerPage.homeLinkColor}>
          <HomeIcon sx={{ fontSize: 32 }} />
        </Link>
      </Box>

      <Paper elevation={0} sx={registerPage.paper}>
        {stage === "form" ? (
          <>
            <Typography variant="h4" sx={registerPage.title}>
              {t("Register New Account")}
            </Typography>

            <Button
              variant="contained"
              onClick={handleGoogleRegister}
              startIcon={currentLang === "en" ? <GoogleIcon /> : <></>}
              endIcon={currentLang === "ar" ? <GoogleIcon sx={{ mx: 1 }} /> : <></>}
              sx={registerPage.button}
            >
              {t("Register with Google")}
            </Button>

            <Divider sx={{ color: "text.secondary", fontSize: "0.8rem" }}>or</Divider>

            <Box
              component="form"
              onSubmit={handleRegister}
              sx={{ display: "flex", flexDirection: "column", gap: 2 }}
            >
              {error && (
                <Alert severity="error" sx={{ borderRadius: "8px" }}>
                  {error}
                </Alert>
              )}
              <Box sx={{ display: "flex", gap: 1.5 }}>
                <TextField
                  label={t("First Name")}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={loading}
                  fullWidth
                  size="small"
                  autoComplete="given-name"
                />
                <TextField
                  label={t("Last Name")}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={loading}
                  fullWidth
                  size="small"
                  autoComplete="family-name"
                />
              </Box>
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
              <TextField
                label={t("Password")}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                fullWidth
                size="small"
                autoComplete="new-password"
                helperText={t("Minimum 8 characters")}
              />
              <Button
                type="submit"
                variant="outlined"
                disabled={loading}
                sx={{
                  ...registerPage.button,
                  backgroundColor: "transparent",
                  color: registerPage.button.backgroundColor,
                  border: `1px solid ${registerPage.button.backgroundColor}`,
                  "@media (hover: hover)": {
                    "&:hover": {
                      backgroundColor: registerPage.button.backgroundColor,
                      color: registerPage.button.color,
                    },
                  },
                  "&.Mui-disabled": {
                    color: registerPage.button.backgroundColor,
                    borderColor: registerPage.button.backgroundColor,
                    opacity: 0.75,
                  },
                }}
              >
                {loading ? <CircularProgress size={20} color="inherit" /> : t("Create Account")}
              </Button>
            </Box>

            <Typography sx={registerPage.helperText}>
              {t("Already a member?")}{" "}
              <Link component={RouterLink} to="/login" sx={registerPage.link}>
                {t("Login")}
              </Link>
            </Typography>
          </>
        ) : (
          <>
            <Typography variant="h4" sx={registerPage.title}>
              {t("Verify Your Email")}
            </Typography>
            <Typography
              sx={{ textAlign: "center", color: "text.secondary", fontSize: "0.9rem" }}
            >
              {t("We sent a 6-digit code to your email. Enter it below.")}
            </Typography>

            <Box
              component="form"
              onSubmit={handleVerifyOTP}
              sx={{ display: "flex", flexDirection: "column", gap: 2 }}
            >
              {error && (
                <Alert severity="error" sx={{ borderRadius: "8px" }}>
                  {error}
                </Alert>
              )}
              {resendMsg && (
                <Alert severity="success" sx={{ borderRadius: "8px" }}>
                  {resendMsg}
                </Alert>
              )}
              <TextField
                label={t("Verification Code")}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                disabled={loading}
                fullWidth
                size="small"
                inputProps={{ maxLength: 6, inputMode: "numeric" }}
                placeholder="123456"
              />
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                sx={registerPage.button}
              >
                {loading ? <CircularProgress size={20} color="inherit" /> : t("Verify")}
              </Button>
            </Box>

            <Typography sx={{ ...registerPage.helperText, fontSize: "0.85rem" }}>
              {t("Didn't receive it?")}{" "}
              <Link
                component="button"
                type="button"
                onClick={handleResend}
                disabled={resendLoading}
                sx={registerPage.link}
              >
                {resendLoading ? t("Sending…") : t("Resend code")}
              </Link>
            </Typography>
          </>
        )}
      </Paper>
    </Container>
  );
};

export default RegisterPage;
