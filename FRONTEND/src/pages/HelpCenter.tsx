import {
  Box,
  Typography,
  Container,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Card,
  CardContent,
  Button,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EmailIcon from "@mui/icons-material/Email";
import BuildIcon from "@mui/icons-material/Build";
import DescriptionIcon from "@mui/icons-material/Description";
import PaymentIcon from "@mui/icons-material/Payment";
import SecurityIcon from "@mui/icons-material/Security";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { useTranslation } from "react-i18next";
import Seo from "../components/ui/Seo";
import { COLORS } from "../theme/tokens";

const helpCategories = [
  {
    icon: <BuildIcon color="primary" />,
    title: "Getting Started",
    description: "Learn the basics of creating your first CV",
  },
  {
    icon: <DescriptionIcon color="primary" />,
    title: "Templates",
    description: "Browse and customize professional templates",
  },
  {
    icon: <PaymentIcon color="primary" />,
    title: "Billing & Pro",
    description: "Manage your subscription and payments",
  },
  {
    icon: <SecurityIcon color="primary" />,
    title: "Account & Security",
    description: "Password, privacy, and account settings",
  },
];

const faqs = [
  {
    q: "How do I create a CV?",
    a: "Navigate to the Builder page, fill in your personal details, experience, education, and skills. Choose a template from the Templates section, then preview and download your CV.",
  },
  {
    q: "What file formats can I export my CV in?",
    a: "You can export your CV as a PDF document. Our system generates high-quality, ATS-friendly PDFs that are ready to submit to employers.",
  },
  {
    q: "What is the Pro plan?",
    a: "The Pro plan gives you access to premium templates (LinkedIn and Modern styles), AI-powered writing assistance, advanced grammar checking, and priority support. It's available as a monthly subscription.",
  },
  {
    q: "Can I change my name or password?",
    a: "Yes! Go to Settings > Profile to change your name (once every 30 days) or Settings > Password to update your password (once every 7 days). Google sign-in users cannot change their password.",
  },
  {
    q: "How do I upload a profile photo?",
    a: "Go to Settings > Profile, click the camera icon on your avatar to upload a new photo. You can also remove your photo using the 'Remove photo' button.",
  },
  {
    q: "How do I delete my account?",
    a: "Go to Settings > Profile, scroll down and click 'Delete account'. This action is permanent and will remove all your data including saved CVs.",
  },
  {
    q: "I signed in with Google. Can I set a password?",
    a: "Currently, Google-authenticated accounts use Google's security. The password section is hidden for Google accounts. You can manage your Google password through your Google account settings.",
  },
  {
    q: "How do I cancel my Pro subscription?",
    a: "Pro subscriptions expire automatically after the billing period. You can view your remaining days in Settings > Plan.",
  },
];

const HelpCenter = () => {
  const { t } = useTranslation();

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Seo
        title={t("Help Center")}
        description={t(
          "Answers about building a CV, AI analysis, credits, plans and payments on OverQualified."
        )}
      />
      {/* Header */}
      <Box sx={{ textAlign: "center", mb: 5 }}>
        <HelpOutlineIcon sx={{ fontSize: 48, color: "primary.main", mb: 1 }} />
        <Typography
          variant="h4"
          fontWeight={700}
          sx={{
            color: COLORS.textPrimary,
            mb: 1,
            fontFamily: '"DM Serif Display", serif',
          }}
        >
          {t("Help Center")}
        </Typography>
        <Typography color="text.secondary" fontSize={15}>
          {t(
            "Find answers to common questions and learn how to get the most out of OverQualified",
          )}
        </Typography>
      </Box>

      {/* Categories */}
      <Grid container spacing={2} sx={{ mb: 5 }}>
        {helpCategories.map((cat, i) => (
          <Grid size={{ xs: 12, sm: 6 }} key={i}>
            <Card
              variant="outlined"
              sx={{
                borderRadius: 3,
                transition: "0.2s",
                cursor: "default",
                "&:hover": { borderColor: "primary.main", boxShadow: 1 },
              }}
            >
              <CardContent
                sx={{ display: "flex", alignItems: "center", gap: 2 }}
              >
                {cat.icon}
                <Box>
                  <Typography fontWeight={600} fontSize={14}>
                    {t(cat.title)}
                  </Typography>
                  <Typography fontSize={12} color="text.secondary">
                    {t(cat.description)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* FAQ */}
      <Typography variant="h5" fontWeight={600} sx={{ mb: 3 }}>
        {t("Frequently Asked Questions")}
      </Typography>
      {faqs.map((faq, i) => (
        <Accordion
          key={i}
          disableGutters
          elevation={0}
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: "12px !important",
            mb: 1.5,
            "&:before": { display: "none" },
            overflow: "hidden",
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={500} fontSize={14}>
              {t(faq.q)}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography fontSize={13} color="text.secondary" lineHeight={1.7}>
              {t(faq.a)}
            </Typography>
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Contact */}
      <Box
        sx={{
          mt: 5,
          p: 4,
          textAlign: "center",
          borderRadius: 3,
          bgcolor: COLORS.bgIconTinted,
          border: "1px solid rgba(26,26,24,0.1)",
        }}
      >
        <Typography fontWeight={600} sx={{ mb: 1 }}>
          {t("Still need help?")}
        </Typography>
        <Typography fontSize={13} color="text.secondary" sx={{ mb: 2 }}>
          {t(
            "Contact our support team and we'll get back to you as soon as possible.",
          )}
        </Typography>
        <Button
          variant="contained"
          startIcon={<EmailIcon />}
          href="mailto:support@overqualified.com"
          sx={{
            backgroundColor: COLORS.primarySurface,
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 600,
            boxShadow: "none",
            "&:hover": {
              backgroundColor: COLORS.primarySurfaceDark,
              boxShadow: "none",
            },
          }}
        >
          {t("Contact Support")}
        </Button>
      </Box>
    </Container>
  );
};

export default HelpCenter;
