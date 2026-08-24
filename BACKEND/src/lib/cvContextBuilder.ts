import { BuilderFormData, coerceCertifications } from "../services/cvParseService";
 
 export function buildCvContext(
   formData: BuilderFormData,
   options: { excludeSection?: string; compact?: boolean } = {}
 ): string {
   const parts: string[] = [];
   const { excludeSection, compact } = options;
 
   if (excludeSection !== "summary" && formData.personalInfo) {
     const title = formData.personalInfo.professionalTitle;
     const summary = formData.personalInfo.ProfessionalSummary;
     if (title || summary) {
       parts.push(`--- PROFESSIONAL SUMMARY ---`);
       if (title) parts.push(`Title: ${title}`);
       if (summary) parts.push(`Summary: ${summary}`);
     }
   }
 
   if (excludeSection !== "experience" && formData.experience?.length > 0) {
     parts.push(`\n--- EXPERIENCE ---`);
     formData.experience.forEach((exp) => {
       const dates = [exp.startDate, exp.endDate].filter(Boolean).join(" to ");
       parts.push(`* ${exp.jobTitle} at ${exp.company} (${dates})`);
       if (!compact && exp.description) {
         parts.push(`  Description:\n  ${exp.description.replace(/\n/g, "\n  ")}`);
       }
     });
   }
 
   if (excludeSection !== "projects" && formData.projects?.length > 0) {
     parts.push(`\n--- PROJECTS ---`);
     formData.projects.forEach((proj) => {
       parts.push(`* ${proj.name} [Tech: ${proj.technologies || "N/A"}]`);
       if (!compact && proj.description) {
         parts.push(`  Description:\n  ${proj.description.replace(/\n/g, "\n  ")}`);
       }
     });
   }
 
   if (excludeSection !== "education" && formData.education?.length > 0) {
     parts.push(`\n--- EDUCATION ---`);
     formData.education.forEach((edu) => {
       parts.push(`* ${edu.degree} from ${edu.institution}`);
       if (!compact && edu.description) {
         parts.push(`  Description:\n  ${edu.description.replace(/\n/g, "\n  ")}`);
       }
     });
   }
 
   if (excludeSection !== "skills" && formData.skills) {
     const categories = formData.skills.skillCategories || [];
     const legacySkills = (formData.skills as any).skills || [];
     const formattedCategories = categories
       .filter((cat) => cat.name || (cat.skills && cat.skills.length > 0))
       .map((cat) => (cat.name ? `${cat.name}: ${cat.skills.join(", ")}` : cat.skills.join(", ")));

     const skillsText = formattedCategories.length > 0
       ? formattedCategories.join("; ")
       : legacySkills.length > 0
         ? legacySkills.join(", ")
         : "";

     const certifications = coerceCertifications(formData.skills.certifications)
       .map((cert) => [cert.name, cert.issuer, cert.date].filter(Boolean).join(" · "))
       .join("; ");
     if (skillsText || formData.skills.languages || certifications) {
       parts.push(`\n--- SKILLS & CREDENTIALS ---`);
       if (skillsText) parts.push(`Skills: ${skillsText}`);
       if (formData.skills.languages) parts.push(`Languages: ${formData.skills.languages}`);
       if (certifications) parts.push(`Certifications: ${certifications}`);
     }
   }
 
   return parts.join("\n").trim();
 }
