import { Box, Container, Typography, Divider } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { useTranslation } from "react-i18next";
import { COLORS } from "../theme/tokens";

export default function PrivacyPage() {
  const { t } = useTranslation();

  const SECTIONS = [
    {
      title: "1. Information We Collect",
      body: `We collect information you provide directly — such as your name, email address, and CV content — when you register or use the Service. We also automatically collect usage data (pages visited, features used, browser type, IP address) through cookies and similar technologies.`,
    },
    {
      title: "2. How We Use Your Information",
      body: `We use your information to: provide and improve the Service; personalise your experience; send transactional emails (account confirmation, receipts); send optional marketing communications (you may opt out at any time); detect and prevent fraud or abuse; and comply with legal obligations.`,
    },
    {
      title: "3. CV Data",
      body: `Your CV content — including personal details, work history, and education — is stored securely and used solely to provide the Service. We do not sell your CV data to third parties. AI analysis features process your CV content only to generate the feedback you request.`,
    },
    {
      title: "4. Sharing Your Information",
      body: `We do not sell or rent your personal information. We may share data with: trusted service providers who assist in operating the Service (e.g., hosting, payment processing, email delivery) under strict confidentiality agreements; authorities when required by law; and successor entities in the event of a merger or acquisition, with prior notice to you.`,
    },
    {
      title: "5. Cookies",
      body: `We use essential cookies to keep you logged in and remember your preferences. Analytics cookies help us understand how the Service is used so we can improve it. You can disable non-essential cookies in your browser settings, though this may affect some features.`,
    },
    {
      title: "6. Data Retention",
      body: `We retain your account data for as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where we are required to retain it for legal or accounting purposes.`,
    },
    {
      title: "7. Security",
      body: `We implement industry-standard security measures including HTTPS encryption, hashed passwords, and access controls to protect your data. However, no method of transmission or storage is 100% secure, and we cannot guarantee absolute security.`,
    },
    {
      title: "8. Your Rights",
      body: `Depending on your location, you may have rights to: access the personal data we hold about you; correct inaccurate data; request deletion of your data; object to or restrict processing; and export your data in a portable format. To exercise any of these rights, contact us at privacy@overqualified.com.`,
    },
    {
      title: "9. Children's Privacy",
      body: `The Service is not directed to children under 16. We do not knowingly collect personal information from children. If you believe we have inadvertently collected such data, please contact us and we will delete it promptly.`,
    },
    {
      title: "10. Third-Party Links",
      body: `The Service may contain links to third-party websites. We are not responsible for the privacy practices of those sites and encourage you to review their privacy policies.`,
    },
    {
      title: "11. Changes to This Policy",
      body: `We may update this Privacy Policy from time to time. We will notify you of significant changes via email or an in-app notice. The "Last updated" date at the top of this page reflects the most recent revision.`,
    },
    {
      title: "12. Contact Us",
      body: `If you have any questions or concerns about this Privacy Policy or how we handle your data, please contact our Data Protection team at: privacy@overqualified.com`,
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
            <LockOutlinedIcon sx={{ color: COLORS.primary, fontSize: 28 }} />
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
            {t("Privacy Policy")}
          </Typography>
          <Typography sx={{ color: COLORS.textSecondary, fontSize: "1rem" }}>
            {t("Last updated: April 16, 2026")}
          </Typography>
        </Box>

        {/* Content card */}
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
              "Your privacy matters to us. This policy explains what data we collect, how we use it, and what choices you have. We are committed to being transparent and handling your information responsibly.",
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
