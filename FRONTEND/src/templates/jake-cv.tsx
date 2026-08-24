import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import FormattedText from "../components/ui/FormattedText";
import BulletList from "./BulletList";
import CustomSections from "./CustomSections";
import SkillCategoryList from "./SkillCategoryList";
import { certificationDetail } from "./certificationText";
import { bulletLines } from "./bulletLines";

const PAGE_HEIGHT = 1123; // exact A4 height at 96 DPI
const PAGE_WIDTH = 794;   // exact A4 width at 96 DPI

const HEADING = {
  fontFamily: '"DM Sans", sans-serif',
  fontSize: "0.8rem",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: "#1a1a18",
  borderBottom: "1.5px solid #1a1a18",
  pb: 0.3,
  mt: 2.5,
  mb: 1,
};

function Bullets({ text, fieldPath }: { text: string; fieldPath: string }) {
  if (!text) return null;
  const lines = bulletLines(text);
  if (lines.length <= 1) {
    return <Typography data-cv-field={fieldPath} sx={{ fontSize: "0.9rem", color: "#333", lineHeight: 1.5 }}><FormattedText text={text} /></Typography>;
  }
  // Marker written as text, not left to `list-style` — see the note in BulletList.
  return (
    <Box component="ul" data-cv-field={fieldPath} sx={{ pl: 0, m: 0, listStyle: 'none' }}>
      {lines.map((l, i) => (
        <Box component="li" key={i} sx={{ fontSize: "0.9rem", color: "#333", lineHeight: 1.5, mb: 0.3, display: 'flex', gap: '0.55em' }}>
          <Box component="span" sx={{ flexShrink: 0 }}>•</Box>
          <Box component="span"><FormattedText text={l} /></Box>
        </Box>
      ))}
    </Box>
  );
}

const JakeCV = ({
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
  // The title is what the CV is applying as, so it gets its own line under the name. Tacked onto
  // the end of the contact string it read as one more contact field, in the same small grey type.
  const contact = [phone, email, linkedin, github, portfolio, location].filter(Boolean).join("  |  ");
  const hasSkills = Boolean((skillCategories && skillCategories.length > 0) || skills);

  const fullContent = (
    <Box sx={{ p: { xs: 4, sm: 5 }, boxSizing: "border-box", display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ textAlign: "center", mb: 1 }}>
        <Typography sx={{ fontSize: "1.9rem", fontWeight: 700, color: "#1a1a18", lineHeight: 1.1 }}>{name || "Your Name"}</Typography>
        {professionalTitle && (
          <Typography sx={{ fontSize: "1rem", fontWeight: 600, color: "#1a1a18", letterSpacing: "0.02em", mt: 0.5 }}>
            {professionalTitle}
          </Typography>
        )}
        {contact && <Typography sx={{ fontSize: "0.82rem", color: "#555", mt: 0.6 }}>{contact}</Typography>}
      </Box>

      {/* Summary */}
      {summary && (
        <Box data-cv-section="personal" sx={{ order: sectionOrder.indexOf('personal') }}>
          <Typography draggable data-cv-drag-handle sx={HEADING}>{t('Summary')}</Typography>
          <Typography data-cv-field="personalInfo.ProfessionalSummary" sx={{ fontSize: "0.9rem", color: "#333", lineHeight: 1.5 }}><FormattedText text={summary} /></Typography>
        </Box>
      )}

      {/* Experience */}
      {experience && experience.length > 0 && (
        <Box data-cv-section="experience" sx={{ order: sectionOrder.indexOf('experience') }}>
          <Typography draggable data-cv-drag-handle sx={HEADING}>{t('Experience')}</Typography>
          {experience.map((exp: any, i: number) => (
            <Box key={i} sx={{ mb: 1.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap" }}>
                <Typography sx={{ fontSize: "0.95rem", fontWeight: 700, color: "#1a1a18" }}>
                  {[exp.role, exp.company].filter(Boolean).join(' — ')}
                </Typography>
                {exp.years && <Typography sx={{ fontSize: "0.82rem", color: "#555", fontStyle: "italic" }}>{exp.years}</Typography>}
              </Box>
              {exp.location && <Typography sx={{ fontSize: "0.8rem", color: "#777", mb: 0.3 }}>{exp.location}</Typography>}
              <Bullets text={exp.description} fieldPath={`experience.${i}.description`} />
            </Box>
          ))}
        </Box>
      )}

      {/* Projects */}
      {projects && projects.length > 0 && (
        <Box data-cv-section="projects" sx={{ order: sectionOrder.indexOf('projects') }}>
          <Typography draggable data-cv-drag-handle sx={HEADING}>{t('Projects')}</Typography>
          {projects.map((proj: any, i: number) => (
            <Box key={i} sx={{ mb: 1.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap" }}>
                <Typography sx={{ fontSize: "0.95rem", fontWeight: 700, color: "#1a1a18" }}>
                  {proj.name}{proj.technologies ? ` — ${proj.technologies}` : ""}
                </Typography>
                <Box sx={{ display: "flex", gap: 1 }}>
                  {proj.demoUrl && (
                    <Typography component="a" href={proj.demoUrl} target="_blank" rel="noopener noreferrer" sx={{ fontSize: "0.8rem", color: "#007acc", textDecoration: "none" }}>
                      Demo
                    </Typography>
                  )}
                  {proj.githubUrl && (
                    <Typography component="a" href={proj.githubUrl} target="_blank" rel="noopener noreferrer" sx={{ fontSize: "0.8rem", color: "#007acc", textDecoration: "none" }}>
                      GitHub
                    </Typography>
                  )}
                </Box>
              </Box>
              <Bullets text={proj.description} fieldPath={`projects.${i}.description`} />
            </Box>
          ))}
        </Box>
      )}

      {/* Education */}
      {education && education.length > 0 && (
        <Box data-cv-section="education" sx={{ order: sectionOrder.indexOf('education') }}>
          <Typography draggable data-cv-drag-handle sx={HEADING}>{t('Education')}</Typography>
          {education.map((edu: any, i: number) => (
            <Box key={i} sx={{ mb: 1.2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap" }}>
                <Typography sx={{ fontSize: "0.95rem", fontWeight: 700, color: "#1a1a18" }}>
                  {edu.degree}{edu.institution ? ` — ${edu.institution}` : ""}
                </Typography>
                <Typography sx={{ fontSize: "0.82rem", color: "#555", fontStyle: "italic" }}>
                  {[edu.startYear, edu.endYear].filter(Boolean).join(" – ")}
                </Typography>
              </Box>
              {edu.location && <Typography sx={{ fontSize: "0.8rem", color: "#777" }}>{edu.location}</Typography>}
              <Bullets text={edu.description} fieldPath={`education.${i}.description`} />
            </Box>
          ))}
        </Box>
      )}

      {/* Skills */}
      {hasSkills && (
        <Box data-cv-section="skills" sx={{ order: sectionOrder.indexOf('skills') }}>
          <Typography draggable data-cv-drag-handle sx={HEADING}>{t('Skills')}</Typography>
          <SkillCategoryList
            categories={skillCategories}
            skills={skills}
            categorySx={{ fontSize: "0.9rem", color: "#333", lineHeight: 1.5 }}
            labelSx={{ fontWeight: 700, color: "#1a1a18" }}
          />
        </Box>
      )}

      {languages && languages.length > 0 && (
        <Box data-cv-section="languages" sx={{ order: sectionOrder.indexOf('languages') }}>
          <Typography draggable data-cv-drag-handle sx={HEADING}>{t('Languages')}</Typography>
          <Typography sx={{ fontSize: "0.9rem", color: "#333" }}>{languages.map((l: any) => l.name).join(", ")}</Typography>
        </Box>
      )}

      {certifications && certifications.length > 0 && (
        <Box data-cv-section="certifications" sx={{ order: sectionOrder.indexOf('certifications') }}>
          <Typography draggable data-cv-drag-handle sx={HEADING}>{t('Certifications')}</Typography>
          {certifications.map((cert: any, index: number) => (
            <Typography key={index} sx={{ fontSize: "0.9rem", color: "#333" }}>
              <Box component="span" sx={{ fontWeight: 600 }}>{cert.name}</Box>
              {certificationDetail(cert) ? ` — ${certificationDetail(cert)}` : ""}
              {cert.description && (
                <BulletList text={cert.description} sx={{ fontSize: "0.85rem", color: "#555" }} />
              )}
            </Typography>
          ))}
        </Box>
      )}
      <CustomSections
        sections={customSections}
        sectionOrder={sectionOrder}
        headingSx={HEADING}
        entryTitleSx={{ fontSize: "0.95rem", fontWeight: 700, color: "#111" }}
        entryMetaSx={{ fontSize: "0.85rem", color: "#555", fontStyle: "italic" }}
        bodySx={{ fontSize: "0.9rem", color: "#333", lineHeight: 1.5 }}
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
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
    boxSizing: "border-box" as const,
    position: "relative" as const,
    overflow: "hidden",
  };

  // Multi-page: render all content in a single flow, shift by page offset
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

export default JakeCV;
