import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import FormattedText from "../components/ui/FormattedText";
import BulletList from "./BulletList";
import CustomSections from "./CustomSections";
import SkillCategoryList from "./SkillCategoryList";
import { certificationDetail } from "./certificationText";

const PAGE_HEIGHT = 1123;
const PAGE_WIDTH = 794;

const ClassicCV = ({
  name,
  email,
  phone,
  location,
  professionalTitle,
  linkedin,
  github,
  portfolio,
  summary,
  skills,
  skillCategories,
  languages,
  certifications,
  experience,
  education,
  projects = [],
  sectionOrder = ['personal', 'projects', 'experience', 'education', 'skills', 'languages', 'certifications'],
  customSections = [],
  printMode = false,
  activePage = 1,
}: any) => {
  const { t } = useTranslation();
  const hasSkills = Boolean((skillCategories && skillCategories.length > 0) || skills);

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
      <Typography variant="h1" sx={{ fontFamily: '"DM Serif Display", serif', fontSize: '2.5rem', color: "#1a1a18", mb: 0.5 }}>{name}</Typography>
      <Typography sx={{ color: "#6b6b66", fontSize: "0.95rem" }}><Box component="span" sx={{ color: "#1a1a18", fontWeight: 500 }}>{t('Email:')} </Box> {email}</Typography>
      <Typography sx={{ color: "#6b6b66", fontSize: "0.95rem" }}><Box component="span" sx={{ color: "#1a1a18", fontWeight: 500 }}>{t('Phone:')} </Box> {phone}</Typography>
      <Typography sx={{ color: "#6b6b66", fontSize: "0.95rem" }}><Box component="span" sx={{ color: "#1a1a18", fontWeight: 500 }}>{t('Location:')} </Box> {location}</Typography>
      <Typography sx={{ color: "#6b6b66", fontSize: "0.95rem" }}><Box component="span" sx={{ color: "#1a1a18", fontWeight: 500 }}>{t('Title:')} </Box> {professionalTitle}</Typography>
      {linkedin && <Typography sx={{ color: "#6b6b66", fontSize: "0.95rem" }}><Box component="span" sx={{ color: "#1a1a18", fontWeight: 500 }}>LinkedIn: </Box> {linkedin}</Typography>}
      {github && <Typography sx={{ color: "#6b6b66", fontSize: "0.95rem" }}><Box component="span" sx={{ color: "#1a1a18", fontWeight: 500 }}>GitHub: </Box> {github}</Typography>}
      {portfolio && <Typography sx={{ color: "#6b6b66", fontSize: "0.95rem" }}><Box component="span" sx={{ color: "#1a1a18", fontWeight: 500 }}>Portfolio: </Box> {portfolio}</Typography>}
      <Box sx={{ mb: 2 }} />

      <Box sx={{ borderBottom: "1px solid rgba(26,26,24,0.1)", mb: 3 }}></Box>

      {summary && (
        <Box data-cv-section="personal" sx={{ marginBottom: "25px", order: sectionOrder.indexOf('personal') }}>
          <Typography draggable data-cv-drag-handle variant="h2" sx={{ color: "#6b6b66", fontSize: '0.85rem', fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", mb: 1 }}>{t('Professional Summary')}</Typography>
          <Typography data-cv-field="personalInfo.ProfessionalSummary" sx={{ color: "#1a1a18", fontSize: "0.95rem" }}><FormattedText text={summary} /></Typography>
        </Box>
      )}

      {experience && experience.length > 0 && (
        <Box data-cv-section="experience" sx={{ marginBottom: "25px", order: sectionOrder.indexOf('experience') }}>
          <Typography draggable data-cv-drag-handle variant="h2" sx={{ color: "#6b6b66", fontSize: '0.85rem', fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", mb: 1.5 }}>{t('Experience')}</Typography>
          <Box component="ul" sx={{ paddingLeft: "16px", m: 0 }}>
            {experience.map((exp: any, index: number) => (
              <Box component="li" key={index} sx={{ marginBottom: '12px', color: "#6b6b66" }}>
                <Typography sx={{ color: "#1a1a18", fontWeight: 500 }}>{[exp.role, exp.company].filter(Boolean).join(' at ')}</Typography>
                {(exp.years || exp.location) && (
                  <Typography sx={{ fontSize: "0.85rem", mb: 0.5 }}>{[exp.years, exp.location].filter(Boolean).join(' | ')}</Typography>
                )}
                <BulletList text={exp.description} fieldPath={`experience.${index}.description`} sx={{ color: "#1a1a18", fontSize: "0.95rem" }} />
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {projects && projects.length > 0 && (
        <Box data-cv-section="projects" sx={{ marginBottom: "25px", order: sectionOrder.indexOf('projects') }}>
          <Typography draggable data-cv-drag-handle variant="h2" sx={{ color: "#6b6b66", fontSize: '0.85rem', fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", mb: 1.5 }}>{t('Projects')}</Typography>
          <Box component="ul" sx={{ paddingLeft: "16px", m: 0 }}>
            {projects.map((proj: any, index: number) => (
              <Box component="li" key={index} sx={{ marginBottom: '12px', color: "#6b6b66" }}>
                <Typography sx={{ color: "#1a1a18" }}>
                  <Box component="span" sx={{ fontWeight: 500 }}>{proj.name}</Box>
                  {proj.technologies ? ` — ${proj.technologies}` : ""}
                </Typography>
                {(proj.demoUrl || proj.githubUrl) && (
                  <Typography sx={{ fontSize: "0.85rem", mb: 0.5 }}>
                    {proj.demoUrl && <a href={proj.demoUrl} target="_blank" rel="noopener noreferrer" style={{ marginRight: 8, color: '#007acc', textDecoration: 'none' }}>Demo</a>}
                    {proj.githubUrl && <a href={proj.githubUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#007acc', textDecoration: 'none' }}>GitHub</a>}
                  </Typography>
                )}
                <BulletList text={proj.description} fieldPath={`projects.${index}.description`} sx={{ color: "#1a1a18", fontSize: "0.95rem" }} />
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {education && education.length > 0 && (
        <Box data-cv-section="education" sx={{ marginBottom: "25px", order: sectionOrder.indexOf('education') }}>
          <Typography draggable data-cv-drag-handle variant="h2" sx={{ color: "#6b6b66", fontSize: '0.85rem', fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", mb: 1.5 }}>{t('Education')}</Typography>
          <Box component="ul" sx={{ paddingLeft: "16px", m: 0 }}>
            {education.map((edu: any, index: number) => (
              <Box component="li" key={index} sx={{ marginBottom: '12px', color: "#6b6b66" }}>
                <Typography sx={{ color: "#1a1a18" }}><Box component="strong" sx={{ fontWeight: 500 }}>{edu.institution}</Box> — {edu.degree}</Typography>
                <Typography sx={{ fontSize: "0.85rem", mb: 0.5 }}>{edu.startYear} to {edu.endYear} | {edu.location}</Typography>
                <BulletList text={edu.description} fieldPath={`education.${index}.description`} sx={{ color: "#1a1a18", fontSize: "0.95rem" }} />
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {hasSkills && (
        <Box data-cv-section="skills" sx={{ marginBottom: "25px", order: sectionOrder.indexOf('skills') }}>
          <Typography draggable data-cv-drag-handle variant="h2" sx={{ color: "#6b6b66", fontSize: '0.85rem', fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", mb: 1 }}>{t('Skills')}</Typography>
          <SkillCategoryList
            categories={skillCategories}
            skills={skills}
            categorySx={{ color: "#1a1a18", fontSize: "0.95rem", lineHeight: 1.5 }}
            labelSx={{ fontWeight: 600, color: "#1a1a18" }}
          />
        </Box>
      )}

      {languages && languages.length > 0 && (
        <Box data-cv-section="languages" sx={{ marginBottom: "25px", order: sectionOrder.indexOf('languages') }}>
          <Typography draggable data-cv-drag-handle variant="h2" sx={{ color: "#6b6b66", fontSize: '0.85rem', fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", mb: 1 }}>{t('Languages')}</Typography>
          <Box component="ul" sx={{ paddingLeft: "16px", m: 0, color: "#1a1a18" }}>
            {languages.map((lang: any, index: number) => (
              <Box component="li" key={index} sx={{ fontSize: "0.95rem" }}>{lang.name}</Box>
            ))}
          </Box>
        </Box>
      )}

      {certifications && certifications.length > 0 && (
        <Box data-cv-section="certifications" sx={{ marginBottom: "25px", order: sectionOrder.indexOf('certifications') }}>
          <Typography draggable data-cv-drag-handle variant="h2" sx={{ color: "#6b6b66", fontSize: '0.85rem', fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", mb: 1 }}>{t('Certifications')}</Typography>
          <Box component="ul" sx={{ paddingLeft: "16px", m: 0, color: "#1a1a18" }}>
            {certifications.map((cert: any, index: number) => (
              <Box component="li" key={index} sx={{ fontSize: "0.95rem" }}>
                {cert.name}
                {certificationDetail(cert) && (
                  <Box component="span" sx={{ color: "#6b6b66", fontSize: "0.85rem" }}> — {certificationDetail(cert)}</Box>
                )}
                {cert.description && (
                  <BulletList text={cert.description} sx={{ color: "#6b6b66", fontSize: "0.85rem" }} />
                )}
              </Box>
            ))}
          </Box>
        </Box>
      )}
      <CustomSections
        sections={customSections}
        sectionOrder={sectionOrder}
        headingSx={{ color: "#6b6b66", fontSize: "0.85rem", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", mb: 1.5 }}
        entryTitleSx={{ color: "#1a1a18", fontWeight: 500 }}
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

export default ClassicCV;
