import assert from "node:assert/strict";
import { extractText, getDocumentProxy, renderPageAsImage } from "unpdf";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { renderCvPdf, closeBrowser } from "./pdfExportService";

// Typecheck, lint and text extraction all passed while the exported PDF had black bands
// printed down every page — none of them look at pixels. This does: it rasterises the real
// export and samples it, so theme leaks, blank pages and lost margins fail loudly.
//
// Needs the frontend running and CLIENT_URL pointing at it:
//   cd FRONTEND && npx vite --port 5199
//   cd BACKEND  && CLIENT_URL=http://localhost:5199 npx tsx src/services/pdfExport.check.ts

const TEMPLATES = ["classic-cv", "harvard-cv", "jake-cv", "modern-cv", "photo-cv", "linkedin-cv"];

// Long enough to spill onto a second page in every template, so continuation pages get checked.
const formData = {
  personalInfo: {
    firstName: "Ahmed", lastName: "Sherif Mostafa", email: "ahmed@example.com",
    phoneCode: "+20", phone: "1285144172", city: "Cairo", country: "Egypt", town: "",
    professionalTitle: "Customer Service Representative & HSE Officer",
    ProfessionalSummary: "Motivated Call Center and Customer Service Representative with experience in sales, communication, and client support. Skilled in handling customer inquiries and achieving sales targets.",
    linkedin: "", github: "", portfolio: "", photo: "",
  },
  experience: Array.from({ length: 5 }, (_, index) => ({
    jobTitle: `Health Inspector ${index + 1}`, company: `Health Unit ${index + 1}`, location: "Benha",
    startDate: "Jul 2023", endDate: "Present",
    description: "- Conducted daily inspections and reports for public health and safety compliance. - Implemented infection control measures and coordinated childhood vaccination programs. - Provided administrative support and maintained accurate documentation.",
  })),
  education: [{ institution: "Tanta Health Technical Institute", degree: "Diploma in Technical Health Studies", location: "Tanta", startYear: "", endYear: "2022", description: "" }],
  projects: [],
  customSections: [
    {
      id: 'courses1',
      title: 'Courses',
      items: [{ title: 'Advanced Safety Management', subtitle: 'Cairo University', date: 'Mar 2024', description: '- Completed 40 hours of field training. - Passed the final assessment.' }],
    },
  ],
  skills: {
    skills: ["OSHA", "IOSH", "Risk Assessment", "HSE Reporting", "Confined Space Safety", "Regulatory Compliance", "Infection Control", "Public Health"],
    languages: "Arabic: Native, English: Good Working Proficiency",
    certifications: [
      { name: "OSHA Certified", issuer: "Occupational Safety and Health Administration (USA)", date: "", url: "", description: "Covered permit-to-work systems and confined space entry control." },
      { name: "IOSH Certified", issuer: "Institution of Occupational Safety and Health (UK)", date: "", url: "" },
    ],
  },
};

// Courses sits before experience, so this also proves a custom section honours the order.
const sectionOrder = ["personal", "custom:courses1", "experience", "education", "skills", "languages", "certifications", "projects"];

interface Pixels {
  width: number;
  height: number;
  at: (x: number, y: number) => [number, number, number];
  inkRatio: number;
  lastInkedRow: number;
}

const rasterise = async (pdf: Buffer, pageNumber: number): Promise<Pixels> => {
  const png = await renderPageAsImage(new Uint8Array(pdf), pageNumber, {
    scale: 1,
    canvasImport: () => import("@napi-rs/canvas") as any,
  });
  const image = await loadImage(Buffer.from(png));
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext("2d");
  // Chrome skips painting a white page background, so those areas come back transparent.
  // Compositing onto white paper first is what a real viewer does — and it keeps a genuinely
  // painted dark background (the bug this check exists for) visible instead of hiding it.
  context.fillStyle = "#fff";
  context.fillRect(0, 0, image.width, image.height);
  context.drawImage(image, 0, 0);
  const { data } = context.getImageData(0, 0, image.width, image.height);

  let inked = 0;
  let lastInkedRow = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] < 240 || data[i + 1] < 240 || data[i + 2] < 240) {
      inked += 1;
      lastInkedRow = Math.floor(i / 4 / image.width);
    }
  }

  return {
    width: image.width,
    height: image.height,
    at: (x, y) => {
      const offset = (y * image.width + x) * 4;
      return [data[offset], data[offset + 1], data[offset + 2]];
    },
    inkRatio: inked / (data.length / 4),
    lastInkedRow,
  };
};

const isWhite = ([r, g, b]: [number, number, number]) => r > 245 && g > 245 && b > 245;

const run = async () => {
  const failures: string[] = [];

  for (const template of TEMPLATES) {
    const { pdf, pageCount } = await renderCvPdf({ formData, sectionOrder, template, fontScale: 1 });
    const fullBleed = template === "modern-cv";

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await rasterise(pdf, pageNumber);
      const label = `${template} p${pageNumber}`;
      const right = page.width - 2;
      const bottom = page.height - 2;

      // The theme leak painted the page canvas, so the margin strips went black.
      // A full-bleed template owns its own edges, so only its top strip is sampled.
      const edges: Array<[string, [number, number, number]]> = fullBleed
        ? [["top-centre", page.at(Math.floor(page.width / 2), 2)]]
        : [
            ["top-left", page.at(2, 2)],
            ["top-right", page.at(right, 2)],
            ["bottom-left", page.at(2, bottom)],
            ["bottom-right", page.at(right, bottom)],
          ];

      for (const [corner, pixel] of edges) {
        if (!isWhite(pixel)) failures.push(`${label}: ${corner} is rgb(${pixel.join(",")}), expected white paper`);
      }

      // Catches a page that rendered nothing, and a page flooded with a background.
      if (page.inkRatio < 0.002) failures.push(`${label}: looks blank (ink ${(page.inkRatio * 100).toFixed(2)}%)`);
      if (page.inkRatio > 0.6) failures.push(`${label}: mostly covered (ink ${(page.inkRatio * 100).toFixed(1)}%)`);

      // Asking a section's entry list not to break moved the whole list to the next page and left
      // most of this one empty. Every page but the last has to be filled close to the bottom.
      const filledTo = page.lastInkedRow / page.height;
      if (pageNumber < pageCount && filledTo < 0.8) {
        failures.push(`${label}: content stops at ${(filledTo * 100).toFixed(0)}% of the page, leaving a blank half-page`);
      }
    }

    // A user-added section must reach the paper in every template, heading and bullets both.
    const document = await getDocumentProxy(new Uint8Array(pdf));
    const { text } = await extractText(document, { mergePages: true });
    const flat = text.replace(/\s+/g, " ").toLowerCase();
    for (const needle of ["courses", "advanced safety management", "passed the final assessment"]) {
      if (!flat.includes(needle)) failures.push(`${template}: custom section text "${needle}" missing`);
    }
    // The optional certification blurb is easy to lose when templates change.
    if (!flat.includes("permit-to-work systems")) {
      failures.push(`${template}: certification description missing`);
    }

    console.log(`${template.padEnd(12)} ${pageCount} page(s) checked`);
  }

  await closeBrowser();

  assert.deepEqual(failures, [], `\n  ${failures.join("\n  ")}\n`);
  console.log("pdfExport render check ok");
};

run().catch(async (error) => {
  await closeBrowser().catch(() => undefined);
  console.error(error instanceof assert.AssertionError ? error.message : error);
  process.exit(1);
});
