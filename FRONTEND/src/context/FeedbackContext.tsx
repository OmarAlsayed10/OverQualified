import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  Typography,
} from "@mui/material";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../hooks/useAuth";

export type EntitlementReason =
  | "ANON_ANALYSIS_LIMIT"
  | "PRO_REQUIRED"
  | "SUBSCRIPTION_REQUIRED"
  | "CREDITS_EXHAUSTED";
export type NotificationSeverity = "success" | "info" | "warning" | "error";

interface NotificationState {
  message: string;
  severity: NotificationSeverity;
}

interface FeedbackValue {
  notify: (message: string, severity?: NotificationSeverity) => void;
  showEntitlement: (reason: EntitlementReason) => void;
  closeEntitlement: () => void;
}

const FeedbackContext = createContext<FeedbackValue | null>(null);

const tierOf = (user: unknown): string => {
  if (!user || typeof user !== "object" || !("planTier" in user)) return "basic";
  return String(user.planTier || "basic").toLowerCase();
};

export const FeedbackProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [notification, setNotification] = useState<NotificationState | null>(null);
  const [entitlement, setEntitlement] = useState<EntitlementReason | null>(null);

  const notify = useCallback(
    (message: string, severity: NotificationSeverity = "error") => {
      setNotification({ message, severity });
    },
    [],
  );
  const showEntitlement = useCallback((reason: EntitlementReason) => {
    setEntitlement(reason);
  }, []);
  const closeEntitlement = useCallback(() => setEntitlement(null), []);

  const dialog = useMemo(() => {
    const tier = tierOf(user);
    if (entitlement === "ANON_ANALYSIS_LIMIT") {
      return {
        title: "Your free analysis is complete",
        body: "Sign in or create a free account to analyze another CV and keep your results.",
        primary: { label: "Create account", to: "/register" },
        secondary: { label: "Sign in", to: "/login" },
      };
    }
    if (entitlement === "PRO_REQUIRED") {
      if (!user) {
        return {
          title: "Sign in to unlock this feature",
          body: "The AI chatbot is available with an active paid plan.",
          primary: { label: "Sign in", to: "/login" },
          secondary: { label: "Create account", to: "/register" },
        };
      }
      return {
        title: "Upgrade to Pro",
        body: "This feature needs an active Pass, Pro, or Ultra plan.",
        primary: { label: "View upgrade options", to: "/payment-check" },
        secondary: null,
      };
    }
    if (entitlement === "SUBSCRIPTION_REQUIRED") {
      if (!user) {
        return {
          title: "Sign in to unlock this feature",
          body: "This feature is part of the Pro and Ultra subscriptions.",
          primary: { label: "Sign in", to: "/login" },
          secondary: { label: "Create account", to: "/register" },
        };
      }
      return {
        title: "Subscribers only",
        body: tier === "pass"
          ? "Your 7-Day Pass does not include this. Subscribe to Pro or Ultra to unlock it."
          : "Subscribe to Pro or Ultra to unlock this feature.",
        primary: { label: "See plans", to: "/payment-check" },
        secondary: null,
      };
    }
    if (entitlement === "CREDITS_EXHAUSTED") {
      if (!user) {
        return {
          title: "Sign in to continue",
          body: "Create an account to receive a credit allowance and continue using AI tools.",
          primary: { label: "Create account", to: "/register" },
          secondary: { label: "Sign in", to: "/login" },
        };
      }
      if (tier === "ultra") {
        return {
          title: "You are out of credits",
          body: "Your Ultra plan is still active. Add a credit pack to continue now.",
          primary: { label: "Buy more credits", to: "/buy-credits" },
          secondary: null,
        };
      }
      if (tier === "pass" || tier === "pro") {
        return {
          title: "You are out of credits",
          body: "Upgrade to Ultra for a larger allowance, or add a credit pack.",
          primary: { label: "Upgrade to Ultra", to: "/payment-check" },
          secondary: { label: "Buy credits", to: "/buy-credits" },
        };
      }
      return {
        title: "Your free credits are used",
        body: "Upgrade to Pro for a monthly allowance, or add a credit pack.",
        primary: { label: "Upgrade to Pro", to: "/payment-check" },
        secondary: { label: "Buy credits", to: "/buy-credits" },
      };
    }
    return null;
  }, [entitlement, user]);

  const go = (to: string) => {
    closeEntitlement();
    navigate(to);
  };

  return (
    <FeedbackContext.Provider value={{ notify, showEntitlement, closeEntitlement }}>
      {children}
      <Snackbar
        open={Boolean(notification)}
        autoHideDuration={5000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={notification?.severity || "error"}
          variant="filled"
          onClose={() => setNotification(null)}
          sx={{ width: "100%" }}
        >
          {notification?.message}
        </Alert>
      </Snackbar>
      <Dialog open={Boolean(dialog)} onClose={closeEntitlement} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ textAlign: "center", pt: 4 }}>
          <WorkspacePremiumRoundedIcon color="primary" sx={{ fontSize: 44, mb: 1 }} />
          <Typography component="span" variant="h5" display="block" fontWeight={800}>
            {dialog?.title ? t(dialog.title) : ""}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" textAlign="center">
            {dialog?.body ? t(dialog.body) : ""}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1, gap: 1 }}>
          <Button onClick={closeEntitlement} color="inherit">{t("Not now")}</Button>
          {dialog?.secondary && (
            <Button variant="outlined" onClick={() => go(dialog.secondary!.to)}>
              {t(dialog.secondary.label)}
            </Button>
          )}
          {dialog?.primary && (
            <Button variant="contained" onClick={() => go(dialog.primary.to)}>
              {t(dialog.primary.label)}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </FeedbackContext.Provider>
  );
};

export const useFeedback = (): FeedbackValue => {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error("useFeedback must be used inside FeedbackProvider");
  return context;
};
