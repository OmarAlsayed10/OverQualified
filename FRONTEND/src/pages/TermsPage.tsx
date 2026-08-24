import { Box, Container, Typography, Divider } from "@mui/material";
import GavelOutlinedIcon from "@mui/icons-material/GavelOutlined";
import { useTranslation } from "react-i18next";
import { COLORS } from "../theme/tokens";

export default function TermsPage() {
  const { t } = useTranslation();

  const SECTIONS = [
    {
      title: "1. Acceptance of Terms",
      body: `By accessing or using OverQualified ("the Service"), you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any part of these terms, you may not use the Service.`,
    },
    {
      title: "2. Description of Service",
      body: `OverQualified provides an AI-powered CV/resume building platform that allows users to create, edit, analyze, and export professional CVs. Premium features are available through a paid subscription ("Pro Plan").`,
    },
    {
      title: "3. User Accounts",
      body: `You must create an account to access most features of the Service. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use. You must be at least 16 years old to use this Service.`,
    },
    {
      title: "4. Acceptable Use",
      body: `You agree not to use the Service to upload or transmit any content that is unlawful, harmful, defamatory, or infringes any third-party rights. You may not attempt to reverse-engineer, scrape, or circumvent any technical measures of the Service. Automated access without our express written consent is prohibited.`,
    },
    {
      title: "5. Subscription and Payments",
      body: `Paid plans are bought as a one-time InstaPay transfer covering a fixed period. You submit the transfer reference and receipt, and we review it manually before access is activated - usually within 24 hours. Nothing renews automatically, and we never store or charge a card. Access ends when the paid period expires unless you buy again. Refunds are handled on a case-by-case basis - contact support within 7 days of a transfer if you believe you were charged in error.`,
    },
    {
      title: "6. Intellectual Property",
      body: `The Service, including all software, design, and content created by OverQualified, is our exclusive property and is protected by copyright, trademark, and other laws. Your CV data remains yours. By using the Service you grant us a limited licence to process and store your data solely to provide the Service.`,
    },
    {
      title: "7. Disclaimer of Warranties",
      body: `The Service is provided "as is" and "as available" without warranties of any kind, express or implied. We do not guarantee that the Service will be uninterrupted, error-free, or that AI-generated suggestions will be accurate or suitable for any particular job application.`,
    },
    {
      title: "8. Limitation of Liability",
      body: `To the fullest extent permitted by law, OverQualified and its affiliates shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of — or inability to use — the Service, even if we have been advised of the possibility of such damages.`,
    },
    {
      title: "9. Termination",
      body: `We reserve the right to suspend or terminate your account at any time for violations of these Terms. You may delete your account at any time from the Settings page. Upon termination, your right to use the Service ceases immediately.`,
    },
    {
      title: "10. Changes to Terms",
      body: `We may update these Terms at any time. We will notify users of material changes via email or an in-app notice. Continued use of the Service after changes constitutes your acceptance of the revised Terms.`,
    },
    {
      title: "11. Governing Law",
      body: `These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which OverQualified operates, without regard to its conflict of law provisions.`,
    },
    {
      title: "12. Contact",
      body: `If you have questions about these Terms, please contact us at: support@overqualified.com`,
    },
  ];

  return (
    <Box sx={{ bgcolor: COLORS.bgLight, minHeight: "100vh", py: { xs: 8, md: 12 } }}>
      <Container maxWidth="md">
        {/* Header */}
        <Box sx={{ textAlign: "center", mb: 8 }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              bgcolor: COLORS.bgIconTinted,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 3,
            }}
          >
            <GavelOutlinedIcon sx={{ color: COLORS.primary, fontSize: 28 }} />
          </Box>
          <Typography
            variant="h1"
            sx={{
              fontFamily: '"DM Serif Display", serif',
              fontSize: { xs: "2.2rem", md: "3rem" },
              color: COLORS.textPrimary,
              mb: 2,
            }}
          >
            {t("Terms of Service")}
          </Typography>
          <Typography sx={{ color: COLORS.textSecondary, fontSize: "1rem" }}>
            {t("Last updated: April 16, 2026")}
          </Typography>
        </Box>

        {/* Intro */}
        <Box
          sx={{
            bgcolor: COLORS.bgWhite,
            borderRadius: "16px",
            p: { xs: 3, md: 5 },
            border: "1px solid rgba(26,26,24,0.08)",
            boxShadow: "0 4px 24px -8px rgba(42,92,69,0.08)",
          }}
        >
          <Typography
            sx={{ color: COLORS.textSecondary, fontSize: "1rem", lineHeight: 1.8, mb: 5 }}
          >
            {t(
              "Please read these Terms of Service carefully before using OverQualified. These terms govern your access to and use of our platform, products, and services.",
            )}
          </Typography>

          {SECTIONS.map((section, i) => (
            <Box key={i}>
              <Typography
                variant="h3"
                sx={{
                  fontFamily: '"DM Serif Display", serif',
                  fontSize: "1.25rem",
                  color: COLORS.textPrimary,
                  mb: 1.5,
                }}
              >
                {t(section.title)}
              </Typography>
              <Typography
                sx={{
                  color: COLORS.textSecondary,
                  fontSize: "0.95rem",
                  lineHeight: 1.8,
                  mb: 3,
                }}
              >
                {t(section.body)}
              </Typography>
              {i < SECTIONS.length - 1 && (
                <Divider sx={{ mb: 3, borderColor: "rgba(26,26,24,0.06)" }} />
              )}
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
