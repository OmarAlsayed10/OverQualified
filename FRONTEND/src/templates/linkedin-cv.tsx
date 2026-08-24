import { Box, Typography } from "@mui/material";
import FormattedText from "../components/ui/FormattedText";
import BulletList from "./BulletList";
import CustomSections from "./CustomSections";
import SkillCategoryList from "./SkillCategoryList";
import { certificationDetail } from "./certificationText";

const PAGE_HEIGHT = 1123;
const PAGE_WIDTH = 794;

const LinkedInCV = ({
  name,
  email,
  phone,
  location,
  professionalTitle,
  linkedin,
  github,
  portfolio,
  summary,
  experience = [],
  education = [],
  skills,
  skillCategories,
  languages = [],
  certifications = [],
  sectionOrder = ['personal', 'projects', 'experience', 'education', 'skills', 'languages', 'certifications'],
  customSections = [],
  printMode = false,
  activePage = 1,
}: any) => {
  const hasSkills = Boolean((skillCategories && skillCategories.length > 0) || skills);
  const fullContent = (
      <Box sx={{
        width: "100%",
        backgroundColor: "#fff",
        padding: "40px",
        fontFamily: `"Segoe UI", Tahoma, Geneva, Verdana, sans-serif`,
        color: "#333",
        lineHeight: 1.6,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: "border-box",
      }}>
        <Box sx={{
          borderBottom: "2px solid #0056b3",
          paddingBottom: "16px",
          marginBottom: "30px",
          textAlign: "center",
        }}>
          <Typography variant="h1" sx={{
            fontSize: "32px",
            fontWeight: "bold",
            color: "#0056b3",
          }}>{name}</Typography>
          <Typography variant="h2" sx={{
            fontSize: "24px",
            fontWeight: "500",
            color: "#0077cc",
            marginTop: "4px",
          }}>{professionalTitle}</Typography>
          <Box sx={{
            fontSize: "15px",
            color: "#555",
            marginTop: "12px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap"
          }}>
            <Box component="span">
              <Box component="span" sx={{ fontWeight: 600, color: "#333", mr: 0.5 }}>Email:</Box> 
              {email}
            </Box> 
            <Box component="span" sx={{ color: "#ccc" }}>|</Box> 
            <Box component="span">
              <Box component="span" sx={{ fontWeight: 600, color: "#333", mr: 0.5 }}>Phone:</Box> 
              {phone}
            </Box> 
            <Box component="span" sx={{ color: "#ccc" }}>|</Box> 
            <Box component="span">
              <Box component="span" sx={{ fontWeight: 600, color: "#333", mr: 0.5 }}>Location:</Box> 
              {location}
            </Box>
            {linkedin && (
              <>
                <Box component="span" sx={{ color: "#ccc" }}>|</Box>
                <Box component="span">
                  <Box component="span" sx={{ fontWeight: 600, color: "#333", mr: 0.5 }}>LinkedIn:</Box>
                  {linkedin}
                </Box>
              </>
            )}
            {github && (
              <>
                <Box component="span" sx={{ color: "#ccc" }}>|</Box>
                <Box component="span">
                  <Box component="span" sx={{ fontWeight: 600, color: "#333", mr: 0.5 }}>GitHub:</Box>
                  {github}
                </Box>
              </>
            )}
            {portfolio && (
              <>
                <Box component="span" sx={{ color: "#ccc" }}>|</Box>
                <Box component="span">
                  <Box component="span" sx={{ fontWeight: 600, color: "#333", mr: 0.5 }}>Portfolio:</Box>
                  {portfolio}
                </Box>
              </>
            )}
          </Box>
        </Box>

        <Box data-cv-section="personal" sx={{ marginBottom: "30px", order: sectionOrder.indexOf('personal') }}>
          <Typography draggable data-cv-drag-handle variant="h3" sx={{
            fontSize: "20px",
            marginBottom: "10px",
            color: "#004080",
            borderBottom: "1px solid #ccc",
            paddingBottom: "4px",
          }}>Summary</Typography>
          <Typography data-cv-field="personalInfo.ProfessionalSummary" sx={{
            fontSize: "14px",
            marginTop: "6px",
            color: "#444",
          }}><FormattedText text={summary} /></Typography>
        </Box>

        <Box data-cv-section="experience" sx={{ marginBottom: "30px", order: sectionOrder.indexOf('experience') }}>
          <Typography draggable data-cv-drag-handle variant="h3" sx={{
            fontSize: "20px",
            marginBottom: "10px",
            color: "#004080",
            borderBottom: "1px solid #ccc",
            paddingBottom: "4px",
          }}>Experience</Typography>
          <Box component="ul" sx={{ listStyle: "none", paddingLeft: "0" }}>
            {experience.map((item, index) => (
              <Box component="li" key={index} sx={{ marginBottom: "16px" }}>
                <Typography sx={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#222",
                }}>{item.role}</Typography>
                <Typography sx={{
                  fontSize: "14px",
                  color: "#666",
                }}>
                  {[item.company, item.years].filter(Boolean).join(' — ')}
                </Typography>
                <BulletList text={item.description} fieldPath={`experience.${index}.description`} sx={{
                  fontSize: "14px",
                  marginTop: "6px",
                  color: "#444",
                }} />
              </Box>
            ))}
          </Box>
        </Box>

        <Box data-cv-section="education" sx={{ marginBottom: "30px", order: sectionOrder.indexOf('education') }}>
          <Typography draggable data-cv-drag-handle variant="h3" sx={{
            fontSize: "20px",
            marginBottom: "10px",
            color: "#004080",
            borderBottom: "1px solid #ccc",
            paddingBottom: "4px",
          }}>Education</Typography>
          <Box component="ul" sx={{ listStyle: "none", paddingLeft: "0" }}>
            {education.map((edu, index) => (
              <Box component="li" key={index} sx={{ marginBottom: "16px" }}>
                <Typography sx={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#222",
                }}>{edu.institution}</Typography>
                <Typography sx={{
                  fontSize: "14px",
                  color: "#666",
                }}>
                  {edu.degree} ({edu.startYear} - {edu.endYear})
                </Typography>
                <Typography sx={{
                  fontSize: "14px",
                  color: "#666",
                }}>{edu.location}</Typography>
                <BulletList text={edu.description} fieldPath={`education.${index}.description`} sx={{
                  fontSize: "14px",
                  marginTop: "6px",
                  color: "#444",
                }} />
              </Box>
            ))}
          </Box>
        </Box>

        {hasSkills && (
          <Box data-cv-section="skills" sx={{ marginBottom: "30px", order: sectionOrder.indexOf('skills') }}>
            <Typography draggable data-cv-drag-handle variant="h3" sx={{
              fontSize: "20px",
              marginBottom: "10px",
              color: "#004080",
              borderBottom: "1px solid #ccc",
              paddingBottom: "4px",
            }}>Skills</Typography>
            <Box sx={{
              marginTop: "10px",
              fontSize: "14px",
              backgroundColor: "#eaf4ff",
              padding: "10px",
              borderRadius: "6px",
              lineHeight: 1.8,
            }}>
              <SkillCategoryList
                categories={skillCategories}
                skills={skills}
                categorySx={{ fontSize: "14px", color: "#1a1a18", lineHeight: 1.8 }}
                labelSx={{ fontWeight: 600, color: "#004080" }}
              />
            </Box>
          </Box>
        )}

        <Box data-cv-section="languages" sx={{ marginBottom: "30px", order: sectionOrder.indexOf('languages') }}>
          <Typography draggable data-cv-drag-handle variant="h3" sx={{
            fontSize: "20px",
            marginBottom: "10px",
            color: "#004080",
            borderBottom: "1px solid #ccc",
            paddingBottom: "4px",
          }}>Languages</Typography>
          <Box component="ul" sx={{ listStyle: "none", paddingLeft: "0" }}>
            {languages.map((lang, index) => (
              <Box component="li" key={index}>
                {lang.name} 
              </Box>
            ))}
          </Box>
        </Box>

        <Box data-cv-section="certifications" sx={{ marginBottom: "30px", order: sectionOrder.indexOf('certifications') }}>
          <Typography draggable data-cv-drag-handle variant="h3" sx={{
            fontSize: "20px",
            marginBottom: "10px",
            color: "#004080",
            borderBottom: "1px solid #ccc",
            paddingBottom: "4px",
          }}>Certifications</Typography>
          <Box component="ul" sx={{ listStyle: "none", paddingLeft: "0" }}>
            {certifications.map((cert: any, index: number) => (
              <Box component="li" key={index} sx={{ marginBottom: "6px" }}>
                <Box component="span" sx={{ fontWeight: 600 }}>{cert.name}</Box>
                {certificationDetail(cert) && (
                  <Box sx={{ fontSize: "14px", color: "#555" }}>{certificationDetail(cert)}</Box>
                )}
                {cert.description && (
                  <BulletList text={cert.description} sx={{ fontSize: "14px", color: "#555" }} />
                )}
              </Box>
            ))}
          </Box>
        </Box>
        <CustomSections
          sections={customSections}
          sectionOrder={sectionOrder}
          headingSx={{ fontSize: "20px", marginBottom: "10px", color: "#004080", borderBottom: "1px solid #ccc", paddingBottom: "4px" }}
          entryTitleSx={{ fontSize: "16px", fontWeight: "bold", color: "#222" }}
          entryMetaSx={{ fontSize: "14px", color: "#666" }}
          bodySx={{ fontSize: "14px", marginTop: "6px", color: "#444" }}
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
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: "10px",
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
    boxSizing: "border-box" as const,
    position: "relative" as const,
    overflow: "hidden",
  };

  return (
    <Box sx={{ backgroundColor: "#f4f7fb", p: { xs: 2, md: 4 }, display: "flex", justifyContent: "center" }}>
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

export default LinkedInCV;
