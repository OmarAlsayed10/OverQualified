import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { builderSnapshotFrom, reapplyBuilderSnapshot, restoreBuilderSnapshot } from "./builderHistoryActions";

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phoneCode: string;
  phone: string;
  country?: string;
  city: string;
  town?: string;
  professionalTitle: string;
  ProfessionalSummary: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  photo?: string;
}

export interface ExperienceItem {
  jobTitle: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface EducationItem {
  institution: string;
  degree: string;
  location: string;
  startYear: string;
  endYear: string;
  description: string;
}

export interface ProjectItem { name: string; technologies: string; demoUrl: string; githubUrl: string; description: string; }

export interface CertificationItem {
  name: string;
  issuer: string;
  date: string;
  url: string;
  description: string;
}

export interface SkillCategory {
  name: string;
  skills: string[];
}

export interface SkillsData {
  skillCategories: SkillCategory[];
  languages: string;
  certifications: CertificationItem[];
}

export interface CustomSectionItem {
  title: string;
  subtitle: string;
  date: string;
  description: string;
}

// A user-named section (Courses, Internships, Volunteering…) holding the same repeatable
// entry shape the built-in sections use, so every template can render it the same way.
export interface CustomSection {
  id: string;
  title: string;
  items: CustomSectionItem[];
}

export interface BuilderFormData {
  personalInfo: PersonalInfo;
  experience: ExperienceItem[];
  education: EducationItem[];
  projects: ProjectItem[];
  skills: SkillsData;
  customSections: CustomSection[];
}

export type BuiltInSection = "personal" | "projects" | "experience" | "education" | "skills" | "languages" | "certifications";

// Custom sections join the same ordering list as `custom:<id>`, so drag-to-reorder, the
// stepper and every template treat them exactly like the built-in ones.
export type CvSection = BuiltInSection | `custom:${string}`;

export const customSectionId = (section: string): string | null =>
  section.startsWith("custom:") ? section.slice("custom:".length) : null;

export interface CvBuilderState {
  formData: BuilderFormData;
  currentCvId: string | null;
  title: string;
  template: string;
  myCvs: any[];
  pageCount: number;
  fontScale: number;
  sectionOrder: CvSection[];
}

export const DEFAULT_TEMPLATE = "classic-cv";

const emptyPersonalInfo = (): PersonalInfo => ({
  firstName: "",
  lastName: "",
  email: "",
  phoneCode: "",
  phone: "",
  country: "",
  city: "",
  town: "",
  professionalTitle: "",
  ProfessionalSummary: "",
  linkedin: "",
  github: "",
  portfolio: "",
  photo: "",
});

export const createEmptyBuilderFormData = (): BuilderFormData => ({
  personalInfo: emptyPersonalInfo(),
  experience: [],
  education: [],
  projects: [],
  skills: { skillCategories: [], languages: "", certifications: [] },
  customSections: [],
});

export const createEmptyCustomSectionItem = (): CustomSectionItem => ({
  title: "",
  subtitle: "",
  date: "",
  description: "",
});

export const createEmptyCertification = (): CertificationItem => ({ name: "", issuer: "", date: "", url: "", description: "" });

const isRecord = (input: unknown): input is Record<string, unknown> =>
  typeof input === "object" && input !== null && !Array.isArray(input);

const recordArray = <T>(input: unknown): T[] =>
  Array.isArray(input) ? input.filter(isRecord) as T[] : [];

const text = (input: unknown): string => (typeof input === "string" ? input : "");

// Certifications used to be one comma-separated string; saved CVs still hold that shape.
const normalizeCertifications = (input: unknown): CertificationItem[] => {
  if (typeof input === "string") {
    return input
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => ({ ...createEmptyCertification(), name }));
  }
  if (!Array.isArray(input)) return [];
  return input
    .map((entry) => {
      if (typeof entry === "string") return { ...createEmptyCertification(), name: entry.trim() };
      if (!isRecord(entry)) return null;
      return {
        name: text(entry.name),
        issuer: text(entry.issuer),
        date: text(entry.date),
        url: text(entry.url),
        description: text(entry.description),
      };
    })
    .filter((entry): entry is CertificationItem => entry !== null);
};

export const normalizeSkillCategories = (input: unknown): SkillCategory[] => {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => {
      if (typeof item === "string") {
        const trimmed = item.trim();
        return trimmed ? { name: "", skills: [trimmed] } : null;
      }
      if (!isRecord(item)) return null;
      const name = text(item.name).trim();
      const skills = Array.isArray(item.skills)
        ? item.skills.map(text).map((s) => s.trim()).filter(Boolean)
        : [];
      if (!name && skills.length === 0) return null;
      return { name, skills };
    })
    .filter((cat): cat is SkillCategory => cat !== null);
};

export const normalizeSkills = (input: unknown): SkillsData => {
  if (!isRecord(input)) return { skillCategories: [], languages: "", certifications: [] };

  let categories: SkillCategory[] = [];
  if (Array.isArray(input.skillCategories)) {
    categories = normalizeSkillCategories(input.skillCategories);
  }
  if (categories.length === 0 && Array.isArray(input.skills)) {
    const flat = input.skills.map(text).map((skill) => skill.trim()).filter(Boolean);
    if (flat.length > 0) {
      categories = [{ name: "Other Skills", skills: flat }];
    }
  }

  return {
    skillCategories: categories,
    languages: text(input.languages),
    certifications: normalizeCertifications(input.certifications),
  };
};

export const normalizeBuilderFormData = (input: unknown): BuilderFormData => {
  const source = isRecord(input) ? input : {};
  return {
    personalInfo: {
      ...emptyPersonalInfo(),
      ...(isRecord(source.personalInfo) ? source.personalInfo : {}),
    } as PersonalInfo,
    experience: recordArray<ExperienceItem>(source.experience),
    education: recordArray<EducationItem>(source.education),
    projects: recordArray<ProjectItem>(source.projects),
    skills: normalizeSkills(source.skills),
    customSections: normalizeCustomSections(source.customSections),
  };
};

const normalizeCustomSections = (input: unknown): CustomSection[] =>
  recordArray<Record<string, unknown>>(input)
    .map((section) => ({
      id: text(section.id) || createSectionId(),
      title: text(section.title),
      items: recordArray<Record<string, unknown>>(section.items).map((item) => ({
        title: text(item.title),
        subtitle: text(item.subtitle),
        date: text(item.date),
        description: text(item.description),
      })),
    }))
    .filter((section) => section.title || section.items.length > 0);

const createSectionId = () => Math.random().toString(36).slice(2, 10);

export const cvBuilderInitialState: CvBuilderState = {
  formData: createEmptyBuilderFormData(),
  currentCvId: null,
  title: "",
  template: DEFAULT_TEMPLATE,
  myCvs: [],
  pageCount: 1,
  fontScale: 1,
  sectionOrder: ["personal", "projects", "experience", "education", "skills", "languages", "certifications"],
};

const ALL_SECTIONS: CvSection[] = ["personal", "projects", "experience", "education", "skills", "languages", "certifications"];

// Section order and font scale come back from untrusted places (localStorage, the API). Every
// built-in section must be present; custom entries are kept only when the CV still holds the
// section they point at, and any missing one is appended so it never becomes unreachable.
const sanitizeSectionOrder = (value: unknown, customSections: CustomSection[] = []): CvSection[] => {
  const stored: unknown[] = Array.isArray(value) ? value : [];
  const customIds = customSections.map((section) => `custom:${section.id}`);
  const known = new Set<string>([...ALL_SECTIONS, ...customIds]);

  const kept = stored.filter((section): section is CvSection => typeof section === "string" && known.has(section));
  if (!ALL_SECTIONS.every((section) => kept.includes(section))) {
    return [...cvBuilderInitialState.sectionOrder, ...customIds] as CvSection[];
  }

  const missing = customIds.filter((id) => !kept.includes(id as CvSection)) as CvSection[];
  return [...kept, ...missing];
};

// Rebuilds a builder slice from an untrusted localStorage blob; anything unrecognised falls back to defaults.
export const hydrateBuilderDraft = (raw: string | null): CvBuilderState | undefined => {
  if (!raw) return undefined;
  try {
    const draft = JSON.parse(raw);
    if (!isRecord(draft)) return undefined;
    const draftForm = normalizeBuilderFormData(draft.formData);
    return {
      ...cvBuilderInitialState,
      formData: draftForm,
      currentCvId: typeof draft.currentCvId === "string" ? draft.currentCvId : null,
      title: typeof draft.title === "string" ? draft.title : "",
      template: typeof draft.template === "string" && draft.template ? draft.template : DEFAULT_TEMPLATE,
      fontScale: clampFontScale(Number(draft.fontScale)),
      sectionOrder: sanitizeSectionOrder(draft.sectionOrder, draftForm.customSections),
    };
  } catch {
    return undefined;
  }
};

// Reducers index formData by a dynamic `section` key; cast to a loose record for that.
type LooseForm = Record<string, any>;

export const FONT_SCALE_MIN = 0.7;
export const FONT_SCALE_MAX = 1.2;

// Rounded fine enough that a typed target size like 14.5px lands on 14.5px, not 14.4px.
const clampFontScale = (value: number): number =>
  Number.isFinite(value) ? Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, Math.round(value * 10000) / 10000)) : 1;

export const cvBuilderSlice = createSlice({
  name: "cvBuilder",
  initialState: cvBuilderInitialState,
  reducers: {
    updateFormData: (state, action: PayloadAction<unknown>) => {
      state.formData = normalizeBuilderFormData(action.payload);
    },
    loadCv: (state, action: PayloadAction<Record<string, any>>) => {
      const cv = action.payload;
      state.formData = normalizeBuilderFormData(cv);
      state.currentCvId = cv.id ?? cv._id ?? null;
      state.title = typeof cv.title === "string" ? cv.title : "";
      state.template = typeof cv.template === "string" && cv.template ? cv.template : DEFAULT_TEMPLATE;
      state.fontScale = clampFontScale(Number(cv.fontScale));
      state.sectionOrder = sanitizeSectionOrder(cv.sectionOrder, state.formData.customSections);
    },
    resetCv: (state) => {
      state.formData = createEmptyBuilderFormData();
      state.currentCvId = null;
      state.title = "";
      state.template = DEFAULT_TEMPLATE;
      state.fontScale = 1;
      state.sectionOrder = cvBuilderInitialState.sectionOrder;
    },
    setCurrentCvId: (state, action: PayloadAction<string | null>) => {
      state.currentCvId = action.payload;
    },
    setCvTitle: (state, action: PayloadAction<string>) => {
      state.title = action.payload;
    },
    setTemplate: (state, action: PayloadAction<string>) => {
      state.template = action.payload;
    },
    setPageCount: (state, action: PayloadAction<number>) => {
      state.pageCount = action.payload;
    },
    setFontScale: (state, action: PayloadAction<number>) => {
      state.fontScale = clampFontScale(action.payload);
    },
    addCustomSection: (state, action: PayloadAction<string>) => {
      const id = createSectionId();
      state.formData.customSections.push({
        id,
        title: action.payload.trim() || "New Section",
        items: [createEmptyCustomSectionItem()],
      });
      state.sectionOrder.push(`custom:${id}`);
    },
    renameCustomSection: (state, action: PayloadAction<{ id: string; title: string }>) => {
      const section = state.formData.customSections.find((entry) => entry.id === action.payload.id);
      if (section) section.title = action.payload.title;
    },
    setCustomSectionItems: (state, action: PayloadAction<{ id: string; items: CustomSectionItem[] }>) => {
      const section = state.formData.customSections.find((entry) => entry.id === action.payload.id);
      if (section) section.items = action.payload.items;
    },
    // The section and its place in the order have to go together, or the stepper keeps a
    // step that renders nothing.
    removeCustomSection: (state, action: PayloadAction<string>) => {
      state.formData.customSections = state.formData.customSections.filter(
        (entry) => entry.id !== action.payload,
      );
      state.sectionOrder = state.sectionOrder.filter((section) => section !== `custom:${action.payload}`);
    },
    setSectionOrder: (state, action: PayloadAction<CvSection[]>) => {
      state.sectionOrder = sanitizeSectionOrder(action.payload, state.formData.customSections);
    },
    moveCvSection: (state, action: PayloadAction<{ from: number; to: number }>) => {
      const { from, to } = action.payload;
      if (from < 0 || to < 0 || from >= state.sectionOrder.length || to >= state.sectionOrder.length) return;
      const [section] = state.sectionOrder.splice(from, 1);
      state.sectionOrder.splice(to, 0, section);
    },
    updateSection: (state, action: PayloadAction<{ section: string; data: any }>) => {
      const { section, data } = action.payload;
      const form = state.formData as LooseForm;

      if (section === "experience" || section === "education" || section === "projects") {
        if (Array.isArray(data)) {
          form[section] = data;
        } else if (form[section].length > 0) {
          form[section][0] = { ...form[section][0], ...data };
        } else {
          form[section] = [data];
        }
      } else if (section === "skills") {
        form[section] = normalizeSkills({ ...form[section], ...data });
      } else {
        form[section] = { ...form[section], ...data };
      }
    },
    updateArraySection: (state, action: PayloadAction<{ section: string; index: number; data: any }>) => {
      const { section, index, data } = action.payload;
      const form = state.formData as LooseForm;
      if (index >= 0 && index < form[section].length) {
        form[section][index] = { ...form[section][index], ...data };
      } else if (index === form[section].length) {
        form[section].push(data);
      }
    },
    addArrayItem: (state, action: PayloadAction<{ section: string; template?: any }>) => {
      const { section, template } = action.payload;
      (state.formData as LooseForm)[section].push(template || {});
    },
    removeArrayItem: (state, action: PayloadAction<{ section: string; index: number }>) => {
      const { section, index } = action.payload;
      const form = state.formData as LooseForm;
      if (index >= 0 && index < form[section].length) {
        form[section].splice(index, 1);
      }
      if (form[section].length === 0) {
        form[section].push({});
      }
    },
    setMyCvs: (state, action: PayloadAction<any[]>) => {
      state.myCvs = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(restoreBuilderSnapshot, (state, action) => {
        Object.assign(state, builderSnapshotFrom(action.payload.nextBuilder));
      })
      .addCase(reapplyBuilderSnapshot, (state, action) => {
        Object.assign(state, builderSnapshotFrom(action.payload.nextBuilder));
      });
  },
});

export const {
  updateFormData,
  loadCv,
  resetCv,
  setCurrentCvId,
  setCvTitle,
  setTemplate,
  setPageCount,
  setFontScale,
  addCustomSection,
  renameCustomSection,
  setCustomSectionItems,
  removeCustomSection,
  setSectionOrder,
  moveCvSection,
  updateSection,
  updateArraySection,
  addArrayItem,
  removeArrayItem,
  setMyCvs,
} = cvBuilderSlice.actions;

export default cvBuilderSlice.reducer;
