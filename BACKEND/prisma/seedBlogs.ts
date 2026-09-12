import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const POSTS = [
  {
    slug: "ats-friendly-cv-guide-2026",
    title: "How to Write an ATS-Friendly CV in 2026",
    category: "CV Writing",
    excerpt:
      "Most CVs are rejected by software before a recruiter ever reads them. Here is how applicant tracking systems actually parse your CV, and how to format it so you get through.",
    content: `Roughly three out of four CVs sent to mid-size and large companies are filtered by an Applicant Tracking System (ATS) before a human sees them. The ATS does not judge your talent. It extracts text, matches it against the job description, and ranks you. If it cannot read your CV, you are invisible.

## What the ATS actually does

An ATS converts your file to plain text, splits it into sections (experience, education, skills), then scores it against keywords from the job posting. Anything it cannot parse (text inside images, columns it reads in the wrong order, icons instead of words) is simply dropped.

## Formatting rules that keep you readable

- Use a single-column layout. Two-column templates often get read left-to-right across both columns, scrambling your dates and titles.
- Stick to standard section headings: "Experience", "Education", "Skills", "Certifications". Creative headings like "My Journey" confuse the parser.
- Save as PDF unless the posting asks for Word. Modern systems read PDF text fine, but scanned or image-based PDFs are unreadable.
- No tables, text boxes, headers or footers for important content. Your name and contact details belong in the body of the page.
- Use a common font (Arial, Calibri, Georgia, Helvetica) at 10 to 12 points.

## Keywords: mirror the job description

The ATS scores exact matches. If the posting says "stakeholder management" and you wrote "worked with stakeholders", you may not get credit. Read the posting, list the 8 to 12 hard skills and responsibilities it repeats, and make sure those exact phrases appear in your CV where they are true.

Spell out acronyms once, then use the short form: "Search Engine Optimization (SEO)". Some systems search for the long form, some for the short one.

## Dates and job titles

Write dates in one consistent format, for example "Mar 2023 – Present". Put your job title on its own line above the company name. Parsers use these patterns to build your work history, and inconsistency breaks them.

## What not to do

- Do not stuff keywords in white text. Modern systems flag it and recruiters see it when they open the file.
- Do not use a photo unless the market expects it. In Egypt and the Gulf a photo is common; for European and North American roles leave it out.
- Do not send the same CV to every job. A 10-minute tailoring pass per application roughly doubles your response rate.

## Quick self-check

Copy your CV, paste it into a plain text editor, and read it. If the order makes sense and nothing important is missing, an ATS will read it the same way. If your skills section turned into a jumble, fix the layout before you apply anywhere else.`,
  },
  {
    slug: "cv-mistakes-egypt-gulf-recruiters",
    title: "7 CV Mistakes That Get You Rejected in Egypt and the Gulf",
    category: "CV Writing",
    excerpt:
      "Recruiters in Cairo, Riyadh and Dubai spend about seven seconds on a first scan. These are the mistakes that end that scan early, and the fixes that keep them reading.",
    content: `Hiring managers across the MENA region see hundreds of CVs per opening. The ones that get a second look share a few traits, and the ones that get rejected share the same handful of mistakes. Here are the seven we see most often when reviewing CVs from the region.

## 1. A vague or missing headline

"Seeking a challenging position in a reputable organization" tells the reader nothing. Replace the objective with a one-line headline: "Senior Accountant | IFRS, SAP FI, 6 years in FMCG". The reader now knows in two seconds whether to keep going.

## 2. Duties instead of results

"Responsible for managing the sales team" is a job description, not an achievement. Rewrite each bullet as action + scope + result: "Led a team of 8 sales reps, grew regional revenue 32% in 12 months". Numbers stand out on a page full of text.

## 3. Personal details that add nothing

Date of birth, marital status, religion, national ID number and full home address are still common on CVs in the region and are almost never needed. They take up prime space and can introduce bias. Keep name, phone, email, city and a LinkedIn link.

## 4. A wall of soft skills

"Hard-working, team player, fast learner, excellent communication skills" appears on nearly every CV, so it differentiates nobody. Show these traits through your achievements instead, and use the skills section for tools, languages, certifications and technical abilities.

## 5. Inconsistent Arabic and English

Choose the language of the job posting and stay in it. Mixing an English CV with Arabic section titles, or listing a degree in Arabic on an otherwise English CV, looks careless. If a role needs both, prepare two clean versions.

## 6. Ignoring the Gulf-specific fields

For roles in Saudi Arabia, the UAE, Qatar and Kuwait, recruiters often need your nationality, current location, visa status and notice period up front. Leaving these out means a follow-up email at best and a skipped CV at worst. Add a compact "Availability" line: "Based in Cairo, open to relocation, 30-day notice".

## 7. A three-page CV for a five-year career

One page for under five years of experience, two pages for more. Recruiters do not read page three. Cut anything older than ten years to a single line, and remove internships once you have two or more full-time roles.

## Before you send it

Read the CV out loud once. Every sentence you stumble on is one the recruiter will skip. Then run it through an ATS check: if the software cannot find your job titles and dates, neither will the recruiter's system.`,
  },
  {
    slug: "answer-tell-me-about-yourself",
    title: "How to Answer 'Tell Me About Yourself' Without Rambling",
    category: "Interviews",
    excerpt:
      "It is the first question in almost every interview, and most candidates either recite their CV or freeze. Use the present-past-future structure to answer in 90 seconds.",
    content: `"Tell me about yourself" is not an invitation to share your life story. The interviewer is asking: who are you professionally, why are you here, and can you communicate clearly? A good answer runs 60 to 90 seconds and follows a simple structure.

## The present-past-future structure

Present: one or two sentences on your current role and what you are known for.
Past: two or three sentences on the experience that got you here, focused on what is relevant to this job.
Future: one or two sentences on why this role is the logical next step.

## Example for a marketing role

"I'm currently a digital marketing specialist at a Cairo-based e-commerce company, where I manage paid campaigns across Meta and Google with a monthly budget of about 400,000 EGP. Before that I spent two years at an agency handling accounts in retail and fintech, which is where I learned to work with tight reporting cycles and demanding clients. I'm looking for a role where I can own the full funnel rather than just acquisition, and the growth marketing position here is exactly that."

Notice what is missing: where they went to school, their hobbies, and the phrase "I'm a hard worker".

## Tailor it to the job

Before every interview, reread the job description and pick the two or three things they clearly care about most. Your "past" section should point at those. The same person interviewing for a data-heavy role would emphasize reporting and analytics; for a creative role they would emphasize campaign concepts.

## Common mistakes

- Starting from university. Unless you graduated this year, nobody needs the timeline from the beginning.
- Listing every job. Pick the ones that build toward this role.
- Going personal too early. Family, hobbies and personal goals can come up later if the interviewer asks.
- Running long. If you pass two minutes, the interviewer has stopped listening and started planning the next question.

## Practice out loud

Write your answer, then say it out loud five times without reading. It should sound like you, not like a script. Record yourself once on your phone and listen for filler words ("umm", "basically", "like"). Cut them.

If you want structured practice with feedback, the Interview Coach in your dashboard generates role-specific questions and scores your answers on clarity and relevance.`,
  },
  {
    slug: "tailor-cv-for-each-job-10-minutes",
    title: "Tailor Your CV for Every Job in Under 10 Minutes",
    category: "Job Search",
    excerpt:
      "Sending one generic CV to fifty jobs gets fewer interviews than sending ten tailored ones. Here is a repeatable process that takes less time than writing a cover letter.",
    content: `Candidates who tailor their CV to each posting get called back roughly twice as often as those who send a generic version. The reason is simple: both the ATS and the recruiter are scanning for a match with the job description, and a tailored CV makes that match obvious.

Here is a process that takes under ten minutes once you have done it a few times.

## Minute 1–2: Extract the requirements

Paste the job description into a document and highlight every hard skill, tool, certification and responsibility. Ignore the fluff ("dynamic environment", "passionate team"). You will usually end up with 8 to 15 items.

## Minute 3–4: Rewrite your headline and summary

Your headline should echo the job title where honest. Applying for "Product Manager – Payments"? Your headline becomes "Product Manager | Payments & Fintech | 5 years". Your two-line summary should mention the three most important requirements from your list.

## Minute 5–7: Reorder and reword bullets

You do not need to write new bullets. Move the most relevant ones to the top of each role. Then adjust wording to match the posting's phrasing: if they say "cross-functional teams" and you wrote "different departments", switch to their phrase.

## Minute 8: Update the skills section

Add any skill from your list that you genuinely have and forgot to mention. Remove skills irrelevant to this role to reduce noise. Order the section so the posting's top requirements come first.

## Minute 9–10: Check and save

Search the CV for each item on your list. Anything missing that you honestly have should be added. Save the file as "Firstname-Lastname-CV-CompanyName.pdf" so you can find it later when they call.

## Keep a master CV

Maintain one long "master" document with every role, bullet and skill you have ever had. Tailoring then becomes a matter of selecting and trimming, not writing from scratch. Never send the master version itself.

## Let the tools do the boring part

The CV analysis in your dashboard compares your CV against a pasted job description, lists the missing keywords and suggests rewrites for weak bullets. Use it as the first pass, then spend your ten minutes on judgment calls the software cannot make.`,
  },
  {
    slug: "do-cover-letters-still-matter",
    title: "Do Cover Letters Still Matter in 2026?",
    category: "Job Search",
    excerpt:
      "Most recruiters skip them, some hiring managers insist on them. Here is when a cover letter helps, when to skip it, and a template that takes five minutes.",
    content: `Ask ten recruiters whether they read cover letters and you will get a split answer. Surveys consistently show that a majority of recruiters at large companies skip them, while hiring managers at smaller companies and in fields like writing, consulting and academia often read them closely. So the honest answer is: it depends on who is reading.

## When a cover letter helps

- The posting asks for one. Skipping it signals you cannot follow instructions.
- You are changing careers or industries. Your CV will not explain why a civil engineer wants a product role; a cover letter can.
- There is a gap or an unusual situation in your history that is better addressed up front.
- The company is small and the hiring manager is reading applications personally.
- The application form has a free-text "why do you want to work here" field. That is a cover letter by another name.

## When to skip it

- The posting says "optional" and it is a large company with a formal ATS pipeline. Your effort is better spent tailoring the CV.
- You would only be repeating your CV in paragraph form.

## The five-minute structure

Keep it to three short paragraphs, under 250 words.

Paragraph 1: Which role you are applying for and one sentence on why this company specifically. Name a product, a project or a value that is real. "I have used your app to pay bills for two years" beats "I admire your innovative culture".

Paragraph 2: Two or three achievements that map directly to the role's top requirements. Use numbers.

Paragraph 3: What you would bring in the first few months, and a plain closing line asking for a conversation.

## Tone

Write the way you would speak to a colleague you respect. Avoid "I am writing to express my keen interest" and every other phrase you have seen a hundred times. Do not apologize, do not beg, and do not say you are a perfect fit; let the achievements make that case.

## Reuse, but re-read

It is fine to keep a base version and adapt it. It is not fine to send one with the wrong company name. Read every cover letter once before sending, specifically checking names, role titles and dates.

If you use the cover letter generator in the application workspace, treat the output as a first draft: it pulls the right achievements from your CV and matches them to the posting, but the sentence about why you want this company should always be yours.`,
  },
];

const main = async () => {
  for (const post of POSTS) {
    await prisma.blog.upsert({
      where: { slug: post.slug },
      update: { title: post.title, excerpt: post.excerpt, content: post.content, category: post.category },
      create: { ...post, published: true },
    });
  }
  console.log(`Seeded ${POSTS.length} blog posts.`);
};

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
