export const omar: any = {
  personalInfo: {
    firstName: "Omar", lastName: "Alsayed", email: "k.omar.alsayed@gmail.com",
    phoneCode: "+20", phone: "01552731225", city: "Cairo", country: "Egypt",
    professionalTitle: "Software Engineer",
    ProfessionalSummary:
      "Software Engineer with more than a year of professional experience at Penta-B, a GIS software firm, where I served as sole or lead engineer for six production plugins on its enterprise mapping platform built with TypeScript and React. I also independently design, develop, and market a licensed offline-first clinic-management solution adopted by medical practices in Egypt, created a freelance e-commerce platform integrating local payment methods, and engineered a multi-provider AI orchestration runtime. My expertise spans the full stack from React architecture and state management to encrypted local storage, desktop packaging, and backend services. A solid foundation in statistics informs my approach to measurement and evaluation.",
    linkedin: "linkedin.com/omaralsayed10", github: "github.com/OmarAlsayed10", portfolio: "",
  },
  experience: [
    {
      jobTitle: "Frontend Web Developer", company: "Penta-B", location: "Cairo, Egypt",
      startDate: "June 2025", endDate: "Present",
      description:
        "Designed and delivered six GIS platform plugins using TypeScript, React, Redux, and the internal SDK, implementing find-nearest, reprojection, and bookmark capabilities with Turf.js, proj4, OpenLayers, and TanStack Query caching.\nOwned the plugin architecture end to end, from SDK integration through release, as sole or lead engineer on each plugin.\nBuilt reusable state management patterns with Redux and TanStack Query that other plugin teams adopted.\nDebugged coordinate reprojection edge cases across projections using proj4 and Turf.js.",
    },
    {
      jobTitle: "Full Stack Web Development Trainee", company: "Information Technology Institute (ITI)",
      location: "Cairo, Egypt", startDate: "Dec 2024", endDate: "May 2025",
      description: "",
    },
  ],
  education: [{
    status: "Graduated", institution: "Tanta University",
    degree: "Bachelor of Science in Statistics", location: "Tanta",
    startYear: "Sep 2021", endYear: "Jul 2024", description: "",
  }],
  projects: [
    {
      name: "OverQualified", technologies: "React, TypeScript, Node.js, Express, PostgreSQL, Prisma",
      demoUrl: "", githubUrl: "github.com/OmarAlsayed10",
      description:
        "Created a full-stack resume and career-assistance platform featuring a React/TypeScript frontend with live CV builder, multiple templates, PDF export, and English/Arabic i18n support.\nBuilt a secure Express API protected by JWT and Google OAuth, leveraging Prisma ORM for PostgreSQL, and added document parsing, Cloudinary media handling, and AI-driven content generation via Groq-hosted Llama models.\nIntegrated AI services that perform resume analysis, vacancy matching, and automatic generation of summaries, skill lists, and cover letters, boosting user productivity throughout career workflows.",
    },
    {
      name: "Ikseer Clinic", technologies: "React, TypeScript, Tauri, Express, SQLite",
      demoUrl: "", githubUrl: "",
      description:
        "Created a cross-platform desktop clinic-management application with a React and TypeScript UI packaged via Tauri (Rust) to produce native Windows and macOS installers.\nImplemented an encrypted local SQLite database accessed through a Node.js Express sidecar, storing encryption keys securely in the OS keychain/credential manager and synchronizing data automatically to PostgreSQL.\nIntegrated AI-powered SOAP note generation and WhatsApp Cloud API messaging to provide automatic appointment reminders and AI-driven clinical documentation.",
    },
  ],
  skills: {
    skills: ["TypeScript", "JavaScript", "SQL", "Java", "React", "Next.js", "Angular", "Redux", "Zustand", "TanStack Query", "Zod", "Tailwind CSS", "OpenLayers", "Turf.js", "proj4", "Node.js", "Express", "NestJS", "GraphQL", "Prisma", "PostgreSQL", "SQLite", "MongoDB", "Tauri", "Vitest", "Jest", "Docker", "GitHub Actions", "Jenkins"],
    languages: "Arabic (Native), English (professional working proficiency)",
    certifications: [
      { name: "Full Stack Web Development", issuer: "SEF Company", date: "", url: "", description: "" },
      { name: "The Complete JavaScript Course", issuer: "Udemy", date: "", url: "", description: "" },
    ],
  },
  customSections: [],
};

export const abdulrahman: any = {
  personalInfo: {
    firstName: "Abdulrahman", lastName: "Alaa El-Sherbini Ibrahim",
    email: "shomanabdo59@gmail.com", phoneCode: "+20", phone: "1288334173",
    city: "Tanta", country: "Egypt", professionalTitle: "Sales & Customer Service Professional",
    ProfessionalSummary:
      "Motivated and results-driven Sales & Customer Service Professional with experience in insurance brokerage, retail sales, and client relations. Skilled in negotiation, communication, and problem-solving, with proven ability to meet sales targets and deliver excellent customer experiences. Recently completed training in marketing and employment skills to strengthen business and professional expertise. Seeking to leverage my background in sales, insurance, and law to contribute to a dynamic organization.",
    linkedin: "", github: "", portfolio: "",
  },
  experience: [
    {
      jobTitle: "Freelance Insurance Broker", company: "Insurance Brokerage Firm", location: "",
      startDate: "Jan 2023", endDate: "Present",
      description:
        "Assisted clients in selecting suitable insurance policies by assessing needs and presenting tailored solutions.\nNegotiated with providers to secure competitive offers for clients.\nBuilt and maintained strong client relationships, resulting in repeat business and referrals.\nIncreased customer satisfaction by simplifying complex insurance terms for easy understanding.",
    },
    {
      jobTitle: "Sales Representative", company: "Beit Al-Qanoun Office", location: "",
      startDate: "Oct 2022", endDate: "Jun 2023",
      description:
        "Promoted legal services to individuals and businesses, resulting in a 15% increase in client acquisition.\nConducted consultations, explained legal offerings, and followed up with prospects.\nCollaborated with the legal team to support clients through the onboarding process.",
    },
    {
      jobTitle: "Sales Associate", company: "Tokyo Clothing Store", location: "",
      startDate: "Jan 2020", endDate: "Jul 2022",
      description:
        "Delivered exceptional retail experiences, elevating customer satisfaction in a fast-paced environment.\nBoosted monthly sales by 10% through strategic upselling and cross-selling techniques.\nOptimized store operations, achieving efficient management of inventory, merchandising, and point-of-sale transactions.\nStreamlined sales processes, resulting in enhanced customer engagement and sales growth.",
    },
  ],
  education: [{
    status: "Graduated", institution: "Tanta University", degree: "Bachelor of Law (LLB)",
    location: "Tanta", startYear: "Oct 2020", endYear: "Jun 2024", description: "",
  }],
  projects: [],
  skills: {
    skills: ["Sales & Negotiation", "Client Acquisition", "Lead Generation", "Persuasion", "Upselling & Cross-selling", "Microsoft Office Suite", "CRM basics", "Customer Service", "Relationship Building", "Complaint Resolution", "Communication Skills", "Market Research"],
    languages: "Arabic (Fluent), English (Intermediate - B1)",
    certifications: [
      { name: "Marketing Course", issuer: "American University in Cairo (AUC) & UCCD", date: "", url: "", description: "" },
      { name: "Employment Skills Training", issuer: "Aspire & UCCD", date: "", url: "", description: "" },
      { name: "Digital Marketing Course", issuer: "", date: "", url: "", description: "Course covered content creation and media buying, lasting approximately 35 hours." },
    ],
  },
  customSections: [],
};

export const talha: any = {
  personalInfo: {
    firstName: "Talha", lastName: "Okda", email: "talha.okda@example.com",
    phoneCode: "+20", phone: "1000000000", city: "Damanhour", country: "Egypt",
    professionalTitle: "Microbiologist",
    ProfessionalSummary:
      "Microbiology graduate with extensive laboratory experience in bacterial culturing, media preparation, and molecular biology techniques. Demonstrated expertise in aseptic practices, quality documentation, and collaborative research supporting pharmaceutical and diagnostic applications.",
    linkedin: "", github: "", portfolio: "",
  },
  experience: [
    {
      jobTitle: "Biotechnologist - Microbiology & Media Preparation", company: "", location: "",
      startDate: "", endDate: "",
      description:
        "Experienced in microbiology laboratory work including bacterial culturing, isolation, and identification under aseptic conditions. Skilled in preparation of culture media according to standard laboratory protocols, including accurate weighing, pH adjustment, sterilization using autoclave, and sterility testing. Strong understanding of laboratory safety, contamination control, and proper documentation to ensure accuracy and reliable results.",
    },
    {
      jobTitle: "Pharmacy Assistant", company: "Three different pharmacies", location: "Damanhour",
      startDate: "2022", endDate: "2025",
      description:
        "Assisted pharmacists in dispensing medications, managing stock, and providing customer service with accuracy and care. Gained practical experience in healthcare and communication.",
    },
    {
      jobTitle: "Science Teacher", company: "", location: "", startDate: "", endDate: "",
      description:
        "Delivered Science instruction to sixth-grade primary students and higher, fostering conceptual understanding and communication skills.\nDeveloped lesson plans aligned with curriculum standards, integrating practical experiments and interactive activities.",
    },
  ],
  education: [{
    status: "Graduated", institution: "Tanta University Faculty of Science",
    degree: "Bachelors Degree in Microbiology", location: "Tanta",
    startYear: "2021", endYear: "2024",
    description: "Gained practical experience in microbiology and molecular biology through academic projects and lab work, including DNA extraction, PCR, and bacterial culturing. Graduation Project: Medical Uses of Bacterial Secondary Metabolites.",
  }],
  projects: [],
  skills: {
    skills: ["Highly developed laboratory skills", "Teamwork and collaboration", "Microsoft Office", "Autoclave", "PCR Thermocycler", "Aseptic technique", "Sterility testing", "ISO 9001 Quality Management", "ISO 13485 Internal Auditing", "Six Sigma", "Contamination control", "Microbiology", "Bacterial culturing", "Media preparation", "Molecular biology", "DNA extraction"],
    languages: "English (B1)",
    certifications: [
      { name: "ISO 9001:2015 - Quality Management System (QMS) & Six Sigma", issuer: "SCS International Cert", date: "October 2025", url: "", description: "" },
      { name: "ISO 13485:2016 - Internal Auditor (Medical Devices QMS)", issuer: "SCS International Cert", date: "November 2025", url: "", description: "" },
    ],
  },
  customSections: [],
};
