import axios from "axios";
import { normalizeJobDescription } from "../lib/jobDescriptionNormalizer";
import { Preference, RawJob, tokenize } from "./jobMatchScoring";

const job = (source: string, values: Omit<RawJob, "source">): RawJob => ({ source, ...values });

export async function fetchAdzuna(preference: Preference): Promise<RawJob[]> {
  const id = process.env.ADZUNA_APP_ID;
  const key = process.env.ADZUNA_APP_KEY;
  if (!id || !key) return [];
  // Adzuna publishes no Egypt (or wider MENA) endpoint — a country code it does not serve
  // 404s the whole provider — so this stays an international/remote source. Egypt-local
  // listings come from Jooble, Careerjet and JSearch, which default to Egypt below.
  const country = process.env.ADZUNA_COUNTRY || "gb";
  const what = encodeURIComponent(`${preference.role} ${preference.keywords ?? ""}`.trim());
  const where = preference.location ? `&where=${encodeURIComponent(preference.location)}` : "";
  const { data } = await axios.get(`https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${id}&app_key=${key}&results_per_page=25&max_days_old=14&what=${what}${where}`, { timeout: 10000 });
  return (data.results || []).map((sourceJob: any) => job("adzuna", {
    externalId: String(sourceJob.id), title: sourceJob.title || "", company: sourceJob.company?.display_name || "Unknown", location: sourceJob.location?.display_name || null, url: sourceJob.redirect_url || "", postedAt: sourceJob.created ? new Date(sourceJob.created) : null, description: normalizeJobDescription(sourceJob.description || "").plainText,
  }));
}

export async function fetchRemotive(preference: Preference): Promise<RawJob[]> {
  const search = encodeURIComponent(`${preference.role} ${preference.keywords ?? ""}`.trim());
  const { data } = await axios.get(`https://remotive.com/api/remote-jobs?search=${search}`, { timeout: 10000 });
  return (data.jobs || []).map((sourceJob: any) => job("remotive", {
    externalId: String(sourceJob.id), title: sourceJob.title || "", company: sourceJob.company_name || "Unknown", location: sourceJob.candidate_required_location || null, url: sourceJob.url || "", postedAt: sourceJob.publication_date ? new Date(sourceJob.publication_date) : null, description: normalizeJobDescription(sourceJob.description || "").plainText,
  }));
}

export async function fetchRemoteOK(): Promise<RawJob[]> {
  const { data } = await axios.get("https://remoteok.com/api", { timeout: 10000, headers: { "User-Agent": "OverQualified Job Radar" } });
  const sourceJobs = Array.isArray(data) ? data.filter((sourceJob: any) => sourceJob.position) : [];
  return sourceJobs.map((sourceJob: any) => job("remoteok", {
    externalId: String(sourceJob.id), title: sourceJob.position || "", company: sourceJob.company || "Unknown", location: sourceJob.location || null, url: sourceJob.url || "", postedAt: sourceJob.date ? new Date(sourceJob.date) : null, description: normalizeJobDescription(sourceJob.description || "").plainText,
  }));
}

export async function fetchJooble(preference: Preference): Promise<RawJob[]> {
  const key = process.env.JOOBLE_KEY;
  if (!key) return [];
  const { data } = await axios.post(`https://jooble.org/api/${key}`, { keywords: `${preference.role} ${preference.keywords ?? ""}`.trim(), location: preference.location || process.env.JOOBLE_LOCATION || "Egypt" }, { timeout: 10000 });
  return (data.jobs || []).map((sourceJob: any) => job("jooble", {
    externalId: String(sourceJob.id ?? sourceJob.link), title: sourceJob.title || "", company: sourceJob.company || "Unknown", location: sourceJob.location || null, url: sourceJob.link || "", postedAt: sourceJob.updated ? new Date(sourceJob.updated) : null, description: normalizeJobDescription(sourceJob.snippet || "").plainText,
  }));
}

export async function fetchTheMuse(preference: Preference): Promise<RawJob[]> {
  const wanted = tokenize(`${preference.role} ${preference.keywords ?? ""}`);
  const { data } = await axios.get("https://www.themuse.com/api/public/jobs?page=1", { timeout: 10000 });
  return (data.results || []).filter((sourceJob: any) => {
    if (wanted.length === 0) return true;
    const titleWords = new Set(tokenize(sourceJob.name || ""));
    return wanted.some((word) => titleWords.has(word));
  }).map((sourceJob: any) => job("themuse", {
    externalId: String(sourceJob.id), title: sourceJob.name || "", company: sourceJob.company?.name || "Unknown", location: sourceJob.locations?.[0]?.name || null, url: sourceJob.refs?.landing_page || "", postedAt: sourceJob.publication_date ? new Date(sourceJob.publication_date) : null, description: normalizeJobDescription(sourceJob.contents || "").plainText,
  }));
}

export async function fetchJSearch(preference: Preference): Promise<RawJob[]> {
  const key = process.env.JSEARCH_KEY;
  if (!key) return [];
  const query = `${preference.role} ${preference.keywords ?? ""} in ${preference.location || "Egypt"}`.trim();
  const { data } = await axios.get("https://jsearch.p.rapidapi.com/search", { params: { query, page: 1, num_pages: 1, date_posted: "month" }, headers: { "X-RapidAPI-Key": key, "X-RapidAPI-Host": "jsearch.p.rapidapi.com" }, timeout: 15000 });
  return (data.data || []).map((sourceJob: any) => job("jsearch", {
    externalId: String(sourceJob.job_id), title: sourceJob.job_title || "", company: sourceJob.employer_name || "Unknown", location: [sourceJob.job_city, sourceJob.job_country].filter(Boolean).join(", ") || null, url: sourceJob.job_apply_link || sourceJob.job_google_link || "", postedAt: sourceJob.job_posted_at_datetime_utc ? new Date(sourceJob.job_posted_at_datetime_utc) : null, description: normalizeJobDescription(sourceJob.job_description || "").plainText,
  }));
}

export async function fetchCareerjet(preference: Preference): Promise<RawJob[]> {
  const affid = process.env.CAREERJET_AFFID;
  if (!affid) return [];
  const { data } = await axios.get("http://public.api.careerjet.net/search", { params: { affid, keywords: `${preference.role} ${preference.keywords ?? ""}`.trim(), location: preference.location || "Egypt", locale_code: "en_EG", pagesize: 25, contenttype: "application/json", sort: "date" }, timeout: 10000 });
  return (data.jobs || []).map((sourceJob: any) => job("careerjet", {
    externalId: String(sourceJob.url), title: sourceJob.title || "", company: sourceJob.company || "Unknown", location: sourceJob.locations || null, url: sourceJob.url || "", postedAt: sourceJob.date ? new Date(sourceJob.date) : null, description: normalizeJobDescription(sourceJob.description || "").plainText,
  }));
}
