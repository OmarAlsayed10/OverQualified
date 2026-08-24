import { contentLines, experienceObjective } from "../cvScoring";
import { suspiciousColumnLines } from "../cvScoring/textParse";
import { contentQualityObjective, formattingLayoutObjective, grammarSpellingObjective, impactResultsScore, METRIC_WEIGHT, VERB_WEIGHT } from "../cvScoring/objectiveScores";

// Bound to the source weights, so rebalancing Impact does not need every assertion rewritten.
const METRIC_MAX = METRIC_WEIGHT;
const VERB_MAX = VERB_WEIGHT;

const UNWRAPPED_RESUME = `
Contact
john.doe@email.com | +1-555-123-4567 | linkedin.com/in/johndoe | New York, NY

Summary
Senior Frontend Engineer with 6 years of experience building scalable GIS applications.

Experience

GIS Frontend Developer
MapTech Inc. — Jan 2020 – Present

• Integrated OpenLayers map layers, reducing data-refresh latency 60%
• Led a cross-functional team of 8, shipping 15+ features across 6 sprints
• Built a real-time analytics dashboard processing 2M daily events
• Designed reusable component library adopted by 3 product teams
• Reduced bundle size 40% through code-splitting and lazy loading
• Completed migration of 3 legacy services to TypeScript, eliminating 400+ runtime errors

Education
Bachelor of Science in Computer Science — State University — 2018

Skills
JavaScript, TypeScript, React, OpenLayers, GIS, Node.js, PostgreSQL
`;

const WRAPPED_RESUME = `
Contact
john.doe@email.com | +1-555-123-4567 | linkedin.com/in/johndoe | New York, NY

Summary
Senior Frontend Engineer with 6 years of experience building scalable GIS applications.

Experience

GIS Frontend Developer
MapTech Inc. — Jan 2020 – Present

• Integrated interactive maps, spatial data layers, and real-time
    analytics using OpenLayers, reducing data-refresh latency 60%
• Led a cross-functional team of 8, shipping 15+ features
    across 6 sprints
• Built a real-time analytics dashboard that processes
    over 2M daily events from multiple data sources
• Designed a reusable component library that was subsequently
    adopted by 3 product teams across the organization
• Reduced bundle size 40% through code-splitting
    and lazy loading strategies
• Completed migration of 3 legacy services to TypeScript,
    eliminating 400+ runtime errors

Education
Bachelor of Science in Computer Science — State University — 2018

Skills
JavaScript, TypeScript, React, OpenLayers, GIS, Node.js, PostgreSQL
`;

describe("deterministic presentation diagnostics", () => {
  it("2026-08 gives identical grammar findings for identical text", () => {
    const cvText = "he Ultimate React Course — Udemy | Cairo,Egypt";

    expect(grammarSpellingObjective(cvText)).toEqual(grammarSpellingObjective(cvText));
    expect(grammarSpellingObjective(cvText)).toEqual({
      score: 90,
      details: [
        'Correct "he Ultimate React Course" to "The Ultimate React Course".',
      ],
      checks: { courseTypo: "he Ultimate React Course" },
    });
  });

  it("does not call inferred action-verb achievements bullet-less", () => {
    const cvText = `
Summary
Software engineer building web applications.
Experience
Frontend Engineer | June 2025 – Present
Designed and delivered production mapping features for enterprise users.
Projects
Portfolio Platform | 2024
Built a full-stack portfolio and deployment workflow.
Skills
TypeScript, React
Education
Bachelor of Science | 2024
`;

    expect(formattingLayoutObjective(cvText).details).not.toContain(
      "No bullet markers found — list achievements as bullets a parser can read",
    );
  });
});

describe("contentLines — wrapped vs unwrapped bullets", () => {
  it("produces the same number of bullets regardless of line wrapping", () => {
    const unwrapped = contentLines(UNWRAPPED_RESUME);
    const wrapped = contentLines(WRAPPED_RESUME);
    expect(wrapped.length).toBe(unwrapped.length);
  });

  it("does not split a wrapped continuation into a separate bullet", () => {
    const bullets = contentLines(WRAPPED_RESUME);
    const continuationFragments = [
      "analytics using OpenLayers",
      "across 6 sprints",
      "over 2M daily events",
      "adopted by 3 product teams",
      "and lazy loading",
    ];
    for (const frag of continuationFragments) {
      const standaloneMatch = bullets.find((b) => b.startsWith(frag));
      expect(standaloneMatch).toBeUndefined();
    }
  });
});

describe("suspiciousColumnLines", () => {
  it("does not flag short pipe-separated technology lists as columns", () => {
    const cvText = `
PROFILE
Backend Developer

PROJECTS
LoanGuard
Laravel | PHP | MySQL
Healthy Food Brand
Digital Marketing | Market Research | Target Audience Analysis
`;

    expect(suspiciousColumnLines(cvText)).toEqual([]);
  });
});
describe("transparent Impact and Content scoring", () => {
  const cvText = `
Summary
Frontend engineer building accessible, maintainable web products with React and TypeScript for distributed teams and complex business workflows at scale.
Experience
Frontend Engineer
Built a production dashboard used by 200 customers.
Designed reusable components for the engineering team.
Skills
React, TypeScript, JavaScript, CSS, HTML, Redux, Git, Jest
Education
Bachelor of Science
`;

  it("treats verified figures as a bonus rather than penalizing their absence", () => {
    const impact = experienceObjective(cvText);

    expect(impactResultsScore(impact)).toBe(100);
    expect(impact.tips).toContain(
      "1 of 2 experience/project bullets have no verified numeric result. Verified figures can strengthen these bullets, but their absence does not reduce the score.",
    );
  });

  it("does not duplicate the optional metric deduction in Content Quality", () => {
    const impact = experienceObjective(cvText);

    expect(contentQualityObjective(cvText, impact).score).toBe(100);
  });
});

describe("experienceObjective — wrapped vs unwrapped scoring", () => {
  it("yields identical verb scores", () => {
    const unwrapped = experienceObjective(UNWRAPPED_RESUME);
    const wrapped = experienceObjective(WRAPPED_RESUME);
    expect(wrapped.verb).toBe(unwrapped.verb);
  });

  it("yields identical metric scores", () => {
    const unwrapped = experienceObjective(UNWRAPPED_RESUME);
    const wrapped = experienceObjective(WRAPPED_RESUME);
    expect(wrapped.metric).toBe(unwrapped.metric);
  });
});

describe("experienceObjective — regression tests for bullet scoring & project blocks", () => {
  it("computes metric and verb ratios ONLY on genuine bullet lines (no dilution from summary/skills/etc without numbers/verbs)", () => {
    const resumeWithUnrelatedNoise = `
Contact
john.doe@email.com | +1-555-123-4567 | linkedin.com/in/johndoe | New York, NY

Summary
A very dedicated professional developer who works extremely hard every single day to deliver software. No numbers here.

Experience

Software Engineer
Tech Company — 2020 - 2023

• Led a team of five developers, delivering a project that cut load times by 40%
• Built a microservice processing 1000 requests per second, improving uptime to 99.9%

Education
Computer Science Degree from University. No verbs, no numbers.

Skills
React, Node.js, SQL, HTML, CSS. No verbs, no numbers.
    `;

    const res = experienceObjective(resumeWithUnrelatedNoise);
    // Since there are only 2 genuine experience bullets:
    // Bullet 1: "Led a team of five developers, delivering a project that cut load times by 40%" (verb = Led, metric = 40)
    // Bullet 2: "Built a microservice processing 1000 requests per second, improving uptime to 99.9%" (verb = Built, metric = 1000)
    // Both bullets contain numbers and start with strong verbs, so:
    // metricRatio = 2/2 = 1.0 (metric score = METRIC_MAX)
    // verbRatio = 2/2 = 1.0 (verb score = VERB_MAX)
    // Total impact score = pct(15, 15) = 100%
    expect(res.metric).toBe(METRIC_MAX);
    expect(res.verb).toBe(VERB_MAX);
  });

  it("detects and extracts the Projects section correctly (projBlock parsing regex fix)", () => {
    const resumeWithProjects = `
Experience
• Built map feature for client dashboard

Projects
• Built a spatial CLI tool for 500 users
• Integrated map APIs with dashboard application

Education
Degree Info
    `;

    // To verify that the Projects block is correctly parsed and evaluated, we can check
    // if the bullets from the projects section are included. If projects parsing failed,
    // only the experience bullet ("Built map feature...") would be detected.
    // Let's test that the bullets from projects are included:
    const res = experienceObjective(resumeWithProjects);
    // Experience bullets: 1 ("Built map feature for client dashboard")
    // Projects bullets: 2 ("Built a spatial CLI tool...", "Integrated map APIs...")
    // Total bullets: 3
    // Verb matches: 3 (Built, Built, Integrated) => verbRatio = 1.0 => verb score = VERB_MAX
    // Metric matches: "500" in project bullet => metricRatio = 1/3 = 0.33 => metric score = round(0.33 * METRIC_MAX) = 1
    expect(res.verb).toBe(VERB_MAX);
    expect(res.metric).toBe(Math.round((1 / 3) * METRIC_MAX));
  });

  it("asserts Impact & Results scores at maximum when all real bullets are compliant, despite highly verbose non-bullet metadata in other sections", () => {
    const verboseResumeWithCompliantBullets = `
Contact Info
Name: Omar Alsayed
Email: omar.alsayed@email.com
Phone: +20-123-456-7890
LinkedIn: linkedin.com/in/omar
Address: Cairo, Egypt, Earth, Milky Way, Universe, Sector 4

Professional Summary
Highly dedicated, passionate, hard-working, diligent, motivated software architect and engineering team member. Enthusiastic about solving complex puzzles, designing elegant abstractions, collaborating with peers, attending status meetings, writing documentation, and drinking coffee.

Experience

Senior Software Architect
AwesomeTech Corp — 2022 - Present
• Led 3 new cloud features, decreasing average response latency by 25%
• Built database query routines, reducing connection load by 40%

Projects

Super Scalable API Gateway
• Designed a gateway handling 5000 requests per second with 99.99% uptime
• Automated deployments using custom scripts, saving 8 developer hours per week

Education
Bachelor of Engineering in Computer Systems
Faculty of Engineering, Department of Computer and Systems Engineering
Graduated with honors, focusing on distributed systems and computer networks

Skills & Technologies
Languages: JavaScript, TypeScript, Python, Ruby, Go, Rust, C++
Frameworks: React, Next.js, Express, Rails, Django, Gin, Actix
Database: PostgreSQL, MongoDB, Redis, Cassandra, Elasticsearch
Tools: Docker, Kubernetes, Terraform, Git, GitHub Actions, AWS, GCP
    `;

    const res = experienceObjective(verboseResumeWithCompliantBullets);
    
    // There are 4 genuine bullet lines in Experience and Projects:
    // 1. "Shipped 3 new cloud features, decreasing average response latency by 25%" (has verb, has number)
    // 2. "Refactored database query routines, reducing connection load by 40%" (has verb, has number)
    // 3. "Designed a gateway handling 5000 requests per second with 99.99% uptime" (has verb, has number)
    // 4. "Automated deployments using custom scripts, saving 8 developer hours per week" (has verb, has number)
    // All 4 start with action verbs and have metrics.
    // Therefore, metricRatio should be 1.0 (metric score = METRIC_MAX) and verbRatio should be 1.0 (verb score = VERB_MAX).
    // They must not be diluted by the summary/contact/education/skills sections.
    expect(res.metric).toBe(METRIC_MAX);
    expect(res.verb).toBe(VERB_MAX);
  });

  it("asserts Impact & Results scores at maximum on the real-world failing resume fixture", () => {
    const REAL_FAILING_RESUME = `Sample Testuser
Full Stack Developer | React.js, Angular.js, Node.js
Test City, XX | +1-000-000-0000 | sample.test.resume@example.com | github.com/sample-test-fixture |
linkedin.com/in/sample-test-fixture
Summary
[SYNTHETIC TEST DATA] Full Stack Developer shipping 6+ production applications with measurable gains: up to 60%
faster data refresh, 42% faster rendering, and a 55% lift in resume ATS pass-rate.
Experience
Frontend Web Developer Jun. 2025 – Present
Penta-B (Test Data) Cairo, Egypt
• Built GIS-based web apps in React.js and Redux, cutting map render time 42%
• Integrated OpenLayers map layers, reducing data-refresh latency 60%
• Led a cross-functional team of 8, shipping 15+ features across 6 sprints
• Improved sprint velocity 25% via Agile ceremonies and stakeholder demos
Full Stack Web Development Trainee Dec. 2024 – May 2025
Information Technology Institute – ITI (Test Data) Cairo, Egypt
• Completed a 6-month full-stack track, ranking top 10% of 120 trainees
• Built 5 production apps with Clean Architecture, cutting revisions 30%
• Delivered 12 sprints of features with a 95% on-time completion rate
Projects
SmartCV – AI-Powered CV Builder & Analyzer | React, Node.js, MongoDB, OpenAI API, JWT
• Built an AI CV builder used by 300+ people, lifting ATS pass-rate 55%
• Implemented JWT auth with a 0% unauthorized-access rate over 6 months
• Designed a React UI that cut task completion time 38%
Ebdaa – Environmental Consulting Website | React.js, Redux, Bootstrap 5
• Built a homepage that improved load speed 40% and session time 22%
• Integrated Redux state management, cutting related bugs 45%
Furnterra – Furniture E-Commerce Platform | Angular, NestJS, Node.js, MongoDB
• Built an e-commerce platform for 1,200+ SKUs with live cart updates
• Built an admin dashboard that cut order-processing time 33%
• Integrated Stripe payments at a 99.9% transaction success rate
StaySpot – Real Estate Platform | Next.js, Sanity.io, Tailwind CSS
• Built a listings platform for 500+ properties, improving search speed 50%
• Integrated Sanity CMS, cutting content publishing time 60%
Technical Skills
Languages: JavaScript, TypeScript
Frontend: React.js, Angular, Next.js, Redux, HTML5, CSS3, Tailwind CSS, Material UI, Bootstrap, jQuery, Three.js
Backend: Node.js, Express.js, NestJS, RESTful APIs, GraphQL, Firebase
Databases: MongoDB, Supabase, Prisma
DevOps & Cloud: Docker, AWS, CI/CD (Jenkins, GitHub Actions), Git, Postman
Concepts & Testing: OOP, SOLID, Clean Architecture, JWT, AJAX, Jest, Agile Collaboration
Certifications
Full Stack Web Development – SEF Company (2023)
The Complete JavaScript Course 2025: From Zero to Expert – Udemy (2025)
The Ultimate React Course 2025: React, Next.js, Redux & More – Udemy (2025)
Education
Tanta University – Faculty of Science (Test Data) Tanta, Egypt
Bachelor of Science in Statistics Sep. 2021 – Jul. 2024
`;

    const res = experienceObjective(REAL_FAILING_RESUME);
    expect(res.metric).toBe(METRIC_MAX);
    expect(res.verb).toBe(VERB_MAX);
  });

  it("handles PDF-extracted bullets when the bullet marker is on its own line", () => {
    const PDF_EXTRACTED_RESUME = `Sample Testuser
Full Stack Developer|React.js, Angular.js, Node.js
Test City, XX|+1-000-000-0000|sample.test.resume@example.com
|github.com/sample-test-fixture|
linkedin.com/in/sample-test-fixture
Summary
[SYNTHETIC TEST DATA] Full Stack Developer shipping 6+ production applications with measurable gains: up to 60%
faster data refresh, 42% faster rendering, and a 55% lift in resume ATS pass-rate.
Experience
Frontend Web DeveloperJun. 2025 – Present
Penta-B (Test Data)Cairo, Egypt
•
Built GIS-based web apps in React.js and Redux, cutting map render time 42%
•
Integrated OpenLayers map layers, reducing data-refresh latency 60%
•
Led a cross-functional team of 8, shipping 15+ features across 6 sprints
•
Improved sprint velocity 25% via Agile ceremonies and stakeholder demos
Full Stack Web Development TraineeDec. 2024 – May 2025
Information Technology Institute – ITI (Test Data)Cairo, Egypt
•
Completed a 6-month full-stack track, ranking top 10% of 120 trainees
•
Built 5 production apps with Clean Architecture, cutting revisions 30%
•
Delivered 12 sprints of features with a 95% on-time completion rate
Projects
SmartCV – AI-Powered CV Builder & Analyzer|React, Node.js, MongoDB, OpenAI API, JWT
•
Built an AI CV builder used by 300+ people, lifting ATS pass-rate 55%
•
Implemented JWT auth with a 0% unauthorized-access rate over 6 months
•
Designed a React UI that cut task completion time 38%
Ebdaa – Environmental Consulting Website|React.js, Redux, Bootstrap 5
•
Built a homepage that improved load speed 40% and session time 22%
•
Integrated Redux state management, cutting related bugs 45%
Furnterra – Furniture E-Commerce Platform|Angular, NestJS, Node.js, MongoDB
•
Built an e-commerce platform for 1,200+ SKUs with live cart updates
•
Built an admin dashboard that cut order-processing time 33%
•
Integrated Stripe payments at a 99.9% transaction success rate
StaySpot – Real Estate Platform|Next.js, Sanity.io, Tailwind CSS
•
Built a listings platform for 500+ properties, improving search speed 50%
•
Integrated Sanity CMS, cutting content publishing time 60%
Technical Skills
Languages: JavaScript, TypeScript
Education
Bachelor of Science in StatisticsSep. 2021 – Jul. 2024`;

    const res = experienceObjective(PDF_EXTRACTED_RESUME);
    expect(res.metric).toBe(METRIC_MAX);
    expect(res.verb).toBe(VERB_MAX);
  });
});

