import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import FormattedText from "../components/ui/FormattedText";
import BulletList from "./BulletList";
import CustomSections from "./CustomSections";
import SkillCategoryList from "./SkillCategoryList";
import { certificationDetail } from "./certificationText";

const PAGE_HEIGHT = 1123;
const PAGE_WIDTH = 794;

const ModernCV = ({
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
  languages = [],
  certifications = [],
  experience = [],
  education = [],
  sectionOrder = ['personal', 'projects', 'experience', 'education', 'skills', 'languages', 'certifications'],
  customSections = [],
  printMode = false,
  activePage = 1,
}: any) => {
  const { t } = useTranslation();
  const hasSkills = Boolean((skillCategories && skillCategories.length > 0) || skills);

  const fullContent = (
    <Box sx={{
      display: 'flex',
      width: '100%',
      backgroundColor: '#ffffff',
      overflow: 'visible',
      minHeight: `${PAGE_HEIGHT}px`,
    }}>
      <Box sx={{
        width: '30%',
        backgroundColor: '#1e293b',
        color: '#ffffff',
        padding: '40px 25px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <Typography variant="h1" sx={{ fontSize: '22px', marginBottom: '20px' }}>{name}</Typography>
        <Typography><Box component="strong">{t('Title:')}</Box> {professionalTitle}</Typography>
        <Typography><Box component="strong">{t('Email:')}</Box> {email}</Typography>
        <Typography><Box component="strong">{t('Phone:')}</Box> {phone}</Typography>
        <Typography><Box component="strong">{t('Location:')}</Box> {location}</Typography>
        {linkedin && <Typography><Box component="strong">LinkedIn:</Box> {linkedin}</Typography>}
        {github && <Typography><Box component="strong">GitHub:</Box> {github}</Typography>}
        {portfolio && <Typography><Box component="strong">Portfolio:</Box> {portfolio}</Typography>}

        {hasSkills && (
          <Box data-cv-section="skills" sx={{ order: sectionOrder.indexOf('skills') }}>
            <Typography draggable data-cv-drag-handle variant="h2" sx={{ fontSize: '18px', marginTop: '30px', marginBottom: '10px', borderBottom: '1px solid #ffffff', paddingBottom: '5px' }}>{t('Skills')}</Typography>
            <SkillCategoryList
              categories={skillCategories}
              skills={skills}
              categorySx={{ fontSize: "14px", color: "#ffffff", lineHeight: 1.5, mb: 0.5 }}
              labelSx={{ fontWeight: 600, color: "#ffffff" }}
            />
          </Box>
        )}
        <Box data-cv-section="languages" sx={{ order: sectionOrder.indexOf('languages') }}>
          <Typography draggable data-cv-drag-handle variant="h2" sx={{ fontSize: '18px', marginTop: '30px', marginBottom: '10px', borderBottom: '1px solid #ffffff', paddingBottom: '5px' }}>{t('Languages')}</Typography>
          <Typography>{languages.map((language: any) => language.name).join(", ")}</Typography>
        </Box>
        <Box data-cv-section="certifications" sx={{ order: sectionOrder.indexOf('certifications') }}>
          <Typography draggable data-cv-drag-handle variant="h2" sx={{ fontSize: '18px', marginTop: '30px', marginBottom: '10px', borderBottom: '1px solid #ffffff', paddingBottom: '5px' }}>{t('Certifications')}</Typography>
          {certifications.map((cert: any, index: number) => (
            <Typography key={index} sx={{ marginBottom: '6px' }}>
              <Box component="span" sx={{ fontWeight: 600 }}>{cert.name}</Box>
              {certificationDetail(cert) && (
                <Box sx={{ fontSize: '13px', opacity: 0.8 }}>{certificationDetail(cert)}</Box>
              )}
              {cert.description && (
                <BulletList text={cert.description} sx={{ fontSize: "13px", opacity: 0.8 }} />
              )}
            </Typography>
          ))}
        </Box>
      </Box>

      <Box sx={{
        width: '70%',
        padding: '40px',
        color: '#333',
        fontFamily: `"Segoe UI", sans-serif`,
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <Box data-cv-section="personal" sx={{ marginBottom: '30px', order: sectionOrder.indexOf('personal') }}>
          <Typography draggable data-cv-drag-handle variant="h2" sx={{ fontSize: '22px', borderBottom: '2px solid #1e293b', paddingBottom: '5px', marginBottom: '10px' }}>{t('Professional Summary')}</Typography>
          <Typography data-cv-field="personalInfo.ProfessionalSummary"><FormattedText text={summary} /></Typography>
        </Box>

        <Box data-cv-section="experience" sx={{ marginBottom: '30px', order: sectionOrder.indexOf('experience') }}>
          <Typography draggable data-cv-drag-handle variant="h2" sx={{ fontSize: '22px', borderBottom: '2px solid #1e293b', paddingBottom: '5px', marginBottom: '10px' }}>{t('Experience')}</Typography>
          {experience.map((exp: any, index: number) => (
            <Box key={index} sx={{ marginBottom: '20px' }}>
              <Typography variant="h3" sx={{ fontSize: '16px', fontWeight: 'bold' }}>{[exp.role, exp.company].filter(Boolean).join(' at ')}</Typography>
              <Typography><Box component="strong">{t('Location:')}</Box> {exp.location}</Typography>
              {(exp.startDate || exp.endDate) && (
                <Typography>{[exp.startDate, exp.endDate].filter(Boolean).join(' - ')}</Typography>
              )}
              <BulletList text={exp.description} fieldPath={`experience.${index}.description`} />
            </Box>
          ))}
        </Box>

        <Box data-cv-section="education" sx={{ marginBottom: '30px', order: sectionOrder.indexOf('education') }}>
          <Typography draggable data-cv-drag-handle variant="h2" sx={{ fontSize: '22px', borderBottom: '2px solid #1e293b', paddingBottom: '5px', marginBottom: '10px' }}>{t('Education')}</Typography>
          {education.map((edu: any, index: number) => (
            <Box key={index} sx={{ marginBottom: '20px' }}>
              <Typography variant="h3" sx={{ fontSize: '16px', fontWeight: 'bold' }}>{edu.degree} - {edu.institution}</Typography>
              <Typography><Box component="strong">{t('Location:')}</Box> {edu.location}</Typography>
              <Typography><Box component="strong">{t('Years:')}</Box> {edu.startYear} - {edu.endYear}</Typography>
              <BulletList text={edu.description} fieldPath={`education.${index}.description`} />
            </Box>
          ))}
        </Box>
        <CustomSections
          sections={customSections}
          sectionOrder={sectionOrder}
          headingSx={{ fontSize: "0.9rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#1e293b", mb: 1 }}
          entryTitleSx={{ fontWeight: 600, color: "#0f172a" }}
          entryMetaSx={{ fontSize: "0.85rem", color: "#64748b" }}
          bodySx={{ fontSize: "0.9rem", color: "#334155" }}
        />
      </Box>
    </Box>
  );

  // Printing hands pagination to the browser, so the fixed-height clipped page frame
  // and the page switcher are dropped and the content flows.
  if (printMode) return fullContent;

  const pageContainerStyle = {
    backgroundColor: "#fff",
    width: `${PAGE_WIDTH}px`,
    height: `${PAGE_HEIGHT}px`,
    border: "1px solid rgba(26,26,24,0.1)",
    borderRadius: "8px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
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

export default ModernCV;
