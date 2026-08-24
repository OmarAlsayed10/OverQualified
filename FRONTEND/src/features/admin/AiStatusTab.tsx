import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  Box,
  Paper,
  Typography,
  Chip,
  LinearProgress,
  Button,
  CircularProgress,
  Stack,
} from "@mui/material";
import { RefreshCw, Clock } from "../../components/icons/MuiIcons";
import { useTranslation } from "react-i18next";
import { COLORS, RADIUS } from "../../theme/tokens";
import { ADMIN_ENDPOINTS } from "../../constants/endpoints";

interface ModelStatus {
  model: string;
  tokensToday: number;
  calls: number;
  dailyLimit: number;
  lastRateLimitAt: number | null;
  out: boolean;
}
interface AiStatus {
  day: string;
  dailyLimit: number;
  models: ModelStatus[];
  limits?: Record<string, number>;
  keysCount?: Record<string, number>;
}

const ALMOST_OUT_PCT = 80;

type State = "OUT" | "ALMOST" | "ACTIVE";
const stateOf = (m: ModelStatus): State => {
  if (m.out) return "OUT";
  if ((m.tokensToday / m.dailyLimit) * 100 >= ALMOST_OUT_PCT) return "ALMOST";
  return "ACTIVE";
};
const STATE_STYLE: Record<State, { label: string; bg: string; fg: string; bar: string; border: string }> = {
  ACTIVE: { label: "ACTIVE", bg: COLORS.successSoft, fg: COLORS.success, bar: COLORS.primary, border: COLORS.borderLight },
  ALMOST: { label: "ALMOST OUT", bg: COLORS.warningSoft, fg: COLORS.accentOrange, bar: COLORS.warning, border: COLORS.warning },
  OUT: { label: "OUT OF TOKENS", bg: COLORS.danger, fg: COLORS.onAccent, bar: COLORS.danger, border: COLORS.dangerBorder },
};

const msToUtcMidnight = (): number => {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0);
  return next - now.getTime();
};
const fmtCountdown = (ms: number): string => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${m}m ${sec}s`;
};

const AiStatusTab = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(msToUtcMidnight());

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(ADMIN_ENDPOINTS.aiStatus, { withCredentials: true });
      setStatus(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const poll = setInterval(fetchStatus, 20000);
    const tick = setInterval(() => setCountdown(msToUtcMidnight()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [fetchStatus]);

  if (loading && !status) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
        <CircularProgress sx={{ color: COLORS.primary }} />
      </Box>
    );
  }

  const qualityModel = "openai/gpt-oss-120b";
  const fastModel = "openai/gpt-oss-20b";
  const qualityKeys = status?.keysCount?.[qualityModel] ?? 1;
  const fastKeys = status?.keysCount?.[fastModel] ?? 1;
  const keyNames = (base: string, n: number) =>
    Array.from({ length: n }, (_, i) => `${base}-key${i + 1}`);

  const knownModels = [
    ...keyNames(qualityModel, qualityKeys),
    ...keyNames(fastModel, fastKeys),
  ];

  const dailyLimit = status?.dailyLimit ?? 100000;
  const byName = new Map((status?.models ?? []).map((m) => [m.model, m]));
  const extras = (status?.models ?? []).filter((m) => !knownModels.includes(m.model));
  const rows: ModelStatus[] = [
    ...knownModels.map(
      (name) =>
        byName.get(name) ?? {
          model: name,
          tokensToday: 0,
          calls: 0,
          dailyLimit: status?.limits?.[name] ?? dailyLimit,
          lastRateLimitAt: null,
          out: false,
        }
    ),
    ...extras,
  ];

  const worst: State = rows.some((r) => stateOf(r) === "OUT")
    ? "OUT"
    : rows.some((r) => stateOf(r) === "ALMOST")
    ? "ALMOST"
    : "ACTIVE";

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <Chip
          label={`Groq — ${t(STATE_STYLE[worst].label)}`}
          sx={{ bgcolor: STATE_STYLE[worst].bg, color: STATE_STYLE[worst].fg, fontWeight: 700 }}
        />
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, color: COLORS.textSecondary }}>
          <Clock size={15} />
          <Typography variant="body2">{t('Resets in')} {fmtCountdown(countdown)} {t('(UTC midnight)')}</Typography>
        </Box>
        <Box sx={{ flex: 1 }} />
        <Button size="small" startIcon={<RefreshCw size={15} />} onClick={fetchStatus} disabled={loading}>
          {t('Refresh')}
        </Button>
      </Box>

      <Stack spacing={2}>
        {rows.map((m) => {
          const st = stateOf(m);
          const style = STATE_STYLE[st];
          const pct = Math.min(100, (m.tokensToday / m.dailyLimit) * 100);
          return (
            <Paper
              key={m.model}
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: RADIUS.xl,
                border: `1px solid ${style.border}`,
                bgcolor: st === "OUT" ? COLORS.dangerSoft : st === "ALMOST" ? COLORS.goldLight : COLORS.bgWhite,
              }}
            >
               <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1, flexWrap: "wrap" }}>
                 <Typography sx={{ fontWeight: 700, fontFamily: "monospace" }}>{m.model}</Typography>
                 <Chip label={t(style.label)} size="small" sx={{ bgcolor: style.bg, color: style.fg, fontWeight: 700 }} />
                 <Box sx={{ flex: 1 }} />
                 <Typography variant="body2" sx={{ color: COLORS.textSecondary }}>
                   {m.calls} {t('calls today')}
                 </Typography>
               </Box>
              <LinearProgress
                variant="determinate"
                value={pct}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: COLORS.bgLight,
                  "& .MuiLinearProgress-bar": { bgcolor: style.bar },
                }}
              />
              <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.75 }}>
                <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                  {m.tokensToday.toLocaleString()} / {m.dailyLimit.toLocaleString()} {t('tokens')} (~{pct.toFixed(0)}%)
                </Typography>
                {m.lastRateLimitAt && (
                  <Typography variant="caption" sx={{ color: COLORS.danger, fontWeight: 600 }}>
                    {t('Rate-limited at')} {new Date(m.lastRateLimitAt).toLocaleTimeString()}
                  </Typography>
                )}
              </Box>
            </Paper>
          );
        })}
      </Stack>

      <Typography variant="caption" sx={{ display: "block", mt: 2, color: COLORS.textSecondary }}>
        {t('Token counts reflect calls routed through the app\'s shared Groq wrapper (CV scoring + optimize). "Out" is set when Groq returns a rate-limit; the per-model daily budget resets at UTC midnight.')}
      </Typography>
    </Box>
  );
};

export default AiStatusTab;
