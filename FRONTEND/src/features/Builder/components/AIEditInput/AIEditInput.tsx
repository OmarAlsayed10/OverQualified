import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Chip,
  CircularProgress,
  Collapse,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import BoltIcon from '@mui/icons-material/Bolt';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { useAuth } from '../../../../hooks/useAuth';
import { AI_ENDPOINTS } from '../../../../constants/endpoints';
import type { RootState } from '../../../../redux/store/store';
import { hasSubscriptionAccess } from '../../../../utils/proAccess';
import { useFeedback } from '../../../../context/FeedbackContext';
import { COLORS, RADIUS } from '../../../../theme/tokens';

interface AIEditInputContext {
  jobTitle?: string;
  company?: string;
  projectName?: string;
  technologies?: string;
  institution?: string;
  degree?: string;
}

interface AIEditInputProps {
  section: string;
  currentContent: string;
  context: AIEditInputContext;
  onResult: (text: string) => void;
}

const QUICK_CHIPS: Record<string, string[]> = {
  experience: ['Write description', 'Add metrics', 'Make concise', 'Add keywords'],
  projects: ['Write description', 'Highlight tech stack', 'Add impact', 'Make concise'],
  summary: ['Write summary', 'Make shorter', 'Add keywords', 'More professional'],
  education: ['Write description', 'Add coursework', 'Make concise'],
  skills: ['Suggest skills', 'Add keywords'],
  languages: ['Format properly', 'Add proficiency level'],
};

const AIEditInput = ({ section, currentContent, context, onResult }: AIEditInputProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showEntitlement, notify } = useFeedback();
  const isSubscribed = hasSubscriptionAccess(user);
  const formData = useSelector((state: RootState) => state.cvBuilder.formData);
  const [expanded, setExpanded] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (expanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [expanded]);

  const handleSend = async (text?: string) => {
    const userPrompt = (text || prompt).trim();
    if (!userPrompt || loading) return;

    if (!isSubscribed) {
      showEntitlement('SUBSCRIPTION_REQUIRED');
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post(
        AI_ENDPOINTS.editFieldAI,
        { sectionName: section, userPrompt, currentContent, context, formData },
        { withCredentials: true },
      );
      // An empty result is a failure, not a no-op. Left silent it looked like the click did
      // nothing at all, which is how a truncated AI response reached the user as "it broke".
      if (!data?.result) {
        notify(t('The AI could not rewrite this. Try again, or reword the request.'), 'error');
        return;
      }
      onResult(data.result);
      setPrompt('');
      setExpanded(false);
    } catch (error) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined;
      notify(message || t('Edit with AI failed. Your text was not changed.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChipClick = (chipText: string) => {
    setPrompt(chipText);
    handleSend(chipText);
  };

  const chips = QUICK_CHIPS[section.toLowerCase()] || QUICK_CHIPS.experience;

  return (
    <Box sx={{ mt: 0.5 }}>
      <Collapse in={!expanded}>
        <Box
          onClick={() => setExpanded(true)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            px: 1.5,
            py: 0.75,
            borderRadius: RADIUS.lg,
            border: `1px dashed ${COLORS.borderMedium}`,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: COLORS.primary,
              bgcolor: COLORS.primaryAlpha12,
            },
          }}
        >
          <AutoAwesomeIcon sx={{ fontSize: 16, color: COLORS.primary }} />
          <Typography
            variant="body2"
            sx={{
              color: COLORS.textSecondary,
              fontSize: '0.8rem',
              fontWeight: 500,
              userSelect: 'none',
            }}
          >
            {t('Edit with AI')}
          </Typography>
        </Box>
      </Collapse>

      <Collapse in={expanded}>
        <Box
          sx={{
            border: `1px solid ${COLORS.primaryAlpha35}`,
            borderRadius: RADIUS.lg,
            bgcolor: COLORS.surfaceSubtle,
            overflow: 'hidden',
            transition: 'all 0.2s ease',
            // Without this the panel butts straight against the field below it.
            mb: 1.25,
          }}
        >
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 1.5,
              py: 0.5,
              borderBottom: `1px solid ${COLORS.borderLight}`,
              bgcolor: COLORS.primaryAlpha12,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <AutoAwesomeIcon sx={{ fontSize: 14, color: COLORS.primary }} />
              <Typography
                variant="caption"
                sx={{ color: COLORS.primary, fontWeight: 600, fontSize: '0.75rem' }}
              >
                {t('Edit with AI')}
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => { setExpanded(false); setPrompt(''); }} sx={{ p: 0.25 }}>
              <CloseIcon sx={{ fontSize: 16, color: COLORS.textSecondary }} />
            </IconButton>
          </Box>

          {/* Quick Chips */}
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.5,
              px: 1.5,
              pt: 1,
              pb: 0.5,
            }}
          >
            {chips.map((chip) => (
              <Chip
                key={chip}
                label={t(chip)}
                size="small"
                icon={<BoltIcon sx={{ fontSize: '14px !important' }} />}
                onClick={() => handleChipClick(chip)}
                disabled={loading}
                sx={{
                  height: 26,
                  fontSize: '0.72rem',
                  fontWeight: 500,
                  bgcolor: COLORS.bgWhite,
                  border: `1px solid ${COLORS.borderMedium}`,
                  color: COLORS.textSecondary,
                  '& .MuiChip-icon': { color: COLORS.primaryLight },
                  '&:hover': {
                    bgcolor: COLORS.primaryAlpha12,
                    borderColor: COLORS.primary,
                    color: COLORS.primary,
                  },
                  cursor: 'pointer',
                }}
              />
            ))}
          </Box>

          {/* Input Row */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1.5, pb: 1, pt: 0.5 }}>
            <TextField
              inputRef={inputRef}
              fullWidth
              size="small"
              variant="outlined"
              placeholder={t('e.g. Write ATS-friendly bullet points for this role...')}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={loading}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: RADIUS.md,
                  bgcolor: COLORS.bgWhite,
                  fontSize: '0.82rem',
                  '& fieldset': { borderColor: COLORS.borderMedium },
                  '&:hover fieldset': { borderColor: COLORS.primary },
                  '&.Mui-focused fieldset': { borderColor: COLORS.primary, borderWidth: 1 },
                },
                '& .MuiInputBase-input': {
                  py: 0.75,
                  px: 1.25,
                },
              }}
            />
            <IconButton
              onClick={() => handleSend()}
              disabled={loading || !prompt.trim()}
              size="small"
              sx={{
                bgcolor: COLORS.primarySurface,
                color: COLORS.onAccent,
                width: 32,
                height: 32,
                '&:hover': { bgcolor: COLORS.primarySurfaceDark },
                '&.Mui-disabled': { bgcolor: COLORS.disabled, color: COLORS.textSecondary },
              }}
            >
              {loading ? (
                <CircularProgress size={16} sx={{ color: COLORS.onAccent }} />
              ) : (
                <SendIcon sx={{ fontSize: 16 }} />
              )}
            </IconButton>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
};

export default AIEditInput;
