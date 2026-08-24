import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import FormattedText from "../components/ui/FormattedText";
import BulletList from "./BulletList";
import CustomSections from "./CustomSections";
import SkillCategoryList from "./SkillCategoryList";
import { certificationDetail } from "./certificationText";

const PAGE_HEIGHT = 1123;
const PAGE_WIDTH = 794;

const HEADING = {
  color: "#6b6b66",
  fontSize: "0.85rem",
  fontWeight: 500,
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  mb: 1,
};

const PhotoCV = ({
  name,
  email,
  phone,
  location,
  professionalTitle,
  linkedin,
  github,
  portfolio,
  photo,
  summary,
  skills,
  skillCategories,
  languages = [],
  certifications = [],
  experience = [],
  education = [],
  projects = [],
  sectionOrder = ['personal', 'projects', 'experience', 'education', 'skills', 'languages', 'certifications'],
  customSections = [],
  printMode = false,
  activePage = 1,
}: any) => {
  const { t } = useTranslation();
  const hasSkills = Boolean((skillCategories && skillCategories.length > 0) || skills);
  const contactLines = [email, phone, location, linkedin, github, portfolio].filter(Boolean);

  const fullContent = (
    <Box sx={{
      backgroundColor: "#ffffff",
      padding: { xs: 3, sm: 5 },
      width: "100%",
      fontFamily: '"DM Sans", sans-serif',
      display: 'flex',
      flexDirection: 'column',
      lineHeight: 1.6,
      boxSizing: "border-box",
    }}>
      <Box sx={{ display: "flex", gap: 3, alignItems: "center", mb: 2.5 }}>
        {photo && (
          <Box
            component="img"
            src={photo}
            alt=""
            sx={{
              width: 118,
              height: 118,
              borderRadius: "50%",
              objectFit: "cover",
              flexShrink: 0,
              border: "3px solid #ece9e2",
            }}
          />
        )}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h1" sx={{ fontFamily: '"DM Serif Display", serif', fontSize: '2.4rem', color: "#1a1a18", lineHeight: 1.1 }}>{name}</Typography>
          {professionalTitle && (
            <Typography sx={{ color: "#6b6b66", fontSize: "1.05rem", mt: 0.3 }}>{professionalTitle}</Typography>
          )}
          <Typography sx={{ color: "#6b6b66", fontSize: "0.85rem", mt: 0.8, wordBreak: "break-word" }}>
            {contactLines.join("  |  ")}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ borderBottom: "1px solid rgba(26,26,24,0.12)", mb: 3 }} />

      {summary && (
        <Box data-cv-section="personal" sx={{ marginBottom: "22px", order: sectionOrder.indexOf('personal') }}>
          <Typography draggable data-cv-drag-handle variant="h2" sx={HEADING}>{t('Professional Summary')}</Typography>
          <Typography data-cv-field="personalInfo.ProfessionalSummary" sx={{ color: "#1a1a18", fontSize: "0.95rem" }}><FormattedText text={summary} /></Typography>
        </Box>
      )}

      {experience.length > 0 && (
        <Box data-cv-section="experience" sx={{ marginBottom: "22px", order: sectionOrder.indexOf('experience') }}>
          <Typography draggable data-cv-drag-handle variant="h2" sx={HEADING}>{t('Experience')}</Typography>
          {experience.map((exp: any, index: number) => (
            <Box key={index} sx={{ mb: 1.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap" }}>
                <Typography sx={{ color: "#1a1a18", fontWeight: 500 }}>{[exp.role, exp.company].filter(Boolean).join(' — ')}</Typography>
                {exp.years && <Typography sx={{ color: "#6b6b66", fontSize: "0.85rem" }}>{exp.years}</Typography>}
              </Box>
              {exp.location && <Typography sx={{ color: "#8a8a84", fontSize: "0.8rem" }}>{exp.location}</Typography>}
              <BulletList text={exp.description} fieldPath={`experience.${index}.description`} sx={{ color: "#1a1a18", fontSize: "0.95rem" }} />
            </Box>
          ))}
        </Box>
      )}

      {projects.length > 0 && (
        <Box data-cv-section="projects" sx={{ marginBottom: "22px", order: sectionOrder.indexOf('projects') }}>
          <Typography draggable data-cv-drag-handle variant="h2" sx={HEADING}>{t('Projects')}</Typography>
          {projects.map((proj: any, index: number) => (
            <Box key={index} sx={{ mb: 1.5 }}>
              <Typography sx={{ color: "#1a1a18", fontWeight: 500 }}>
                {proj.name}{proj.technologies ? ` — ${proj.technologies}` : ""}
              </Typography>
              {(proj.demoUrl || proj.githubUrl) && (
                <Typography sx={{ fontSize: "0.85rem" }}>
                  {proj.demoUrl && <a href={proj.demoUrl} target="_blank" rel="noopener noreferrer" style={{ marginRight: 8, color: '#007acc', textDecoration: 'none' }}>Demo</a>}
                  {proj.githubUrl && <a href={proj.githubUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#007acc', textDecoration: 'none' }}>GitHub</a>}
                </Typography>
              )}
              <BulletList text={proj.description} fieldPath={`projects.${index}.description`} sx={{ color: "#1a1a18", fontSize: "0.95rem" }} />
            </Box>
          ))}
        </Box>
      )}

      {education.length > 0 && (
        <Box data-cv-section="education" sx={{ marginBottom: "22px", order: sectionOrder.indexOf('education') }}>
          <Typography draggable data-cv-drag-handle variant="h2" sx={HEADING}>{t('Education')}</Typography>
          {education.map((edu: any, index: number) => (
            <Box key={index} sx={{ mb: 1.2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap" }}>
                <Typography sx={{ color: "#1a1a18", fontWeight: 500 }}>{edu.degree}{edu.institution ? ` — ${edu.institution}` : ""}</Typography>
                <Typography sx={{ color: "#6b6b66", fontSize: "0.85rem" }}>{[edu.startYear, edu.endYear].filter(Boolean).join(" – ")}</Typography>
              </Box>
              {edu.location && <Typography sx={{ color: "#8a8a84", fontSize: "0.8rem" }}>{edu.location}</Typography>}
              <BulletList text={edu.description} fieldPath={`education.${index}.description`} sx={{ color: "#1a1a18", fontSize: "0.95rem" }} />
            </Box>
          ))}
        </Box>
      )}

      {hasSkills && (
        <Box data-cv-section="skills" sx={{ marginBottom: "22px", order: sectionOrder.indexOf('skills') }}>
          <Typography draggable data-cv-drag-handle variant="h2" sx={HEADING}>{t('Skills')}</Typography>
          <SkillCategoryList
            categories={skillCategories}
            skills={skills}
            categorySx={{ color: "#1a1a18", fontSize: "0.95rem", lineHeight: 1.5 }}
            labelSx={{ fontWeight: 600, color: "#1a1a18" }}
          />
        </Box>
      )}

      {languages.length > 0 && (
        <Box data-cv-section="languages" sx={{ marginBottom: "22px", order: sectionOrder.indexOf('languages') }}>
          <Typography draggable data-cv-drag-handle variant="h2" sx={HEADING}>{t('Languages')}</Typography>
          <Typography sx={{ color: "#1a1a18", fontSize: "0.95rem" }}>{languages.map((lang: any) => lang.name).join(", ")}</Typography>
        </Box>
      )}

      {certifications.length > 0 && (
        <Box data-cv-section="certifications" sx={{ marginBottom: "22px", order: sectionOrder.indexOf('certifications') }}>
          <Typography draggable data-cv-drag-handle variant="h2" sx={HEADING}>{t('Certifications')}</Typography>
          {certifications.map((cert: any, index: number) => (
            <Typography key={index} sx={{ color: "#1a1a18", fontSize: "0.95rem" }}>
              <Box component="span" sx={{ fontWeight: 600 }}>{cert.name}</Box>
              {certificationDetail(cert) ? ` — ${certificationDetail(cert)}` : ""}
              {cert.description && (
                <BulletList text={cert.description} sx={{ color: "#6b6b66", fontSize: "0.85rem" }} />
              )}
            </Typography>
          ))}
        </Box>
      )}
      <CustomSections
        sections={customSections}
        sectionOrder={sectionOrder}
        headingSx={{ color: "#6b6b66", fontSize: "0.85rem", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", mb: 1.5 }}
        entryTitleSx={{ color: "#1a1a18", fontWeight: 600, fontSize: "1rem" }}
        entryMetaSx={{ color: "#6b6b66", fontSize: "0.85rem" }}
        bodySx={{ color: "#1a1a18", fontSize: "0.95rem" }}
      />
    </Box>
  );

  // Printing hands pagination to the browser, so the fixed-height clipped page frame
  // and the page switcher are dropped and the content flows.
  if (printMode) return fullContent;

  const pageContainerStyle = {
    backgroundColor: "#fff",
    width: `${PAGE_WIDTH}px`,
    height: `${PAGE_HEIGHT}px`,
    fontFamily: '"DM Sans", sans-serif',
    border: "1px solid rgba(26,26,24,0.1)",
    borderRadius: "10px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
    boxSizing: "border-box" as const,
    position: "relative" as const,
    overflow: "hidden",
  };

  return (
    <Box sx={{ backgroundColor: "#f5f4ef", p: { xs: 2, md: 4 }, display: "flex", justifyContent: "center" }}>
      <Box data-cv-page sx={pageContainerStyle}>
        <Box sx={{
          width: "100%",
          transform: `translateY(-${(activePage - 1) * PAGE_HEIGHT}px)`,
          transition: "transform 0.3s ease",
        }}>
          {fullContent}
        </Box>
      </Box>
    </Box>
  );
};

export default PhotoCV;
