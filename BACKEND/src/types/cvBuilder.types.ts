export interface CVParams {
  title?: string;
  template?: string;
  sectionOrder?: string[];
  customSections?: unknown;
  fontScale?: number;
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    location: string;
    professionalTitle: string;  
    ProfessionalSummary: string;
    linkedin?: string;
    github?: string;
    portfolio?: string;
  };
 
  experience?: Array<{
    jobTitle?: string;
    company?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }>;
  education: Array<{
    institution: string;
    degree: string;
    location: string;
    startYear: string;
    endYear: string;
    description: string;
  }>;
  projects?: Array<{
    name?: string;
    technologies?: string;
    demoUrl?: string;
    githubUrl?: string;
    description?: string;
  }>;
  skills: {
    skillCategories?: Array<{ name: string; skills: string[] }>;
    skills?: string[];
    languages?: string;
    certifications?: Array<{ name: string; issuer: string; date: string; url: string; description?: string }>;
  };
}
