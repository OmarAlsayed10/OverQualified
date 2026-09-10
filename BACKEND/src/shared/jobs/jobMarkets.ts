import { paddedFoldedText } from "../../lib/textFolding";

export interface JobMarket {
  country: string;
  label: string;
  careerjetLocale: string;
  jsearchCountry: string;
}

export const MENA_MARKETS: JobMarket[] = [
  { country: "EG", label: "Egypt", careerjetLocale: "en_EG", jsearchCountry: "eg" },
  { country: "AE", label: "United Arab Emirates", careerjetLocale: "en_AE", jsearchCountry: "ae" },
  { country: "SA", label: "Saudi Arabia", careerjetLocale: "en_SA", jsearchCountry: "sa" },
  { country: "QA", label: "Qatar", careerjetLocale: "en_QA", jsearchCountry: "qa" },
  { country: "KW", label: "Kuwait", careerjetLocale: "en_KW", jsearchCountry: "kw" },
  { country: "BH", label: "Bahrain", careerjetLocale: "en_BH", jsearchCountry: "bh" },
  { country: "OM", label: "Oman", careerjetLocale: "en_OM", jsearchCountry: "om" },
  { country: "JO", label: "Jordan", careerjetLocale: "en_JO", jsearchCountry: "jo" },
  { country: "LB", label: "Lebanon", careerjetLocale: "en_LB", jsearchCountry: "lb" },
  { country: "MA", label: "Morocco", careerjetLocale: "fr_MA", jsearchCountry: "ma" },
  { country: "TN", label: "Tunisia", careerjetLocale: "fr_TN", jsearchCountry: "tn" },
  { country: "DZ", label: "Algeria", careerjetLocale: "fr_DZ", jsearchCountry: "dz" },
];

export const PRIMARY_MARKET = MENA_MARKETS[0];

const COUNTRY_TERMS: Record<string, string[]> = {
  EG: [
    "egypt", "مصر", "جمهورية مصر العربية", "cairo", "القاهرة", "new cairo", "giza", "الجيزة",
    "alexandria", "الإسكندرية", "nasr city", "مدينة نصر", "maadi", "المعادي", "heliopolis",
    "6th of october", "السادس من أكتوبر", "sheikh zayed", "port said", "بورسعيد", "mansoura",
    "المنصورة", "tanta", "طنطا", "asyut", "assiut", "luxor", "الأقصر", "aswan", "أسوان",
    "suez", "السويس", "ismailia", "الإسماعيلية", "hurghada", "الغردقة", "sharm el sheikh",
  ],
  AE: [
    "united arab emirates", "uae", "الإمارات", "dubai", "دبي", "abu dhabi", "أبو ظبي", "أبوظبي",
    "sharjah", "الشارقة", "ajman", "عجمان", "ras al khaimah", "رأس الخيمة", "fujairah", "الفجيرة",
  ],
  SA: [
    "saudi arabia", "saudi", "ksa", "السعودية", "المملكة العربية السعودية", "riyadh", "الرياض",
    "jeddah", "جدة", "dammam", "الدمام", "khobar", "الخبر", "mecca", "makkah", "مكة",
    "medina", "المدينة المنورة", "neom", "نيوم", "dhahran", "الظهران",
  ],
  QA: ["qatar", "قطر", "doha", "الدوحة"],
  KW: ["kuwait", "الكويت"],
  BH: ["bahrain", "البحرين", "manama", "المنامة"],
  OM: ["oman", "سلطنة عمان", "muscat", "مسقط", "salalah", "صلالة"],
  JO: ["jordan", "الأردن", "amman", "irbid", "إربد", "aqaba", "العقبة", "الزرقاء"],
  LB: ["lebanon", "لبنان", "beirut", "بيروت", "tripoli lebanon"],
  MA: ["morocco", "المغرب", "casablanca", "الدار البيضاء", "rabat", "الرباط", "marrakech", "مراكش", "tangier", "طنجة"],
  TN: ["tunisia", "تونس", "tunis", "sfax", "صفاقس"],
  DZ: ["algeria", "الجزائر", "algiers", "oran", "وهران", "constantine"],
  IQ: ["iraq", "العراق", "baghdad", "بغداد", "erbil", "أربيل", "basra", "البصرة"],
  PS: ["palestine", "فلسطين", "ramallah", "رام الله", "gaza", "غزة", "nablus", "نابلس"],
  SD: ["sudan", "السودان", "khartoum", "الخرطوم"],
  LY: ["libya", "ليبيا", "tripoli libya", "طرابلس", "benghazi", "بنغازي"],
  US: ["united states", "usa", "u s a", "new york", "san francisco", "california", "texas", "seattle", "boston", "chicago", "austin"],
  GB: ["united kingdom", "uk", "england", "scotland", "wales", "london", "manchester", "birmingham", "edinburgh"],
  DE: ["germany", "deutschland", "berlin", "munich", "hamburg", "frankfurt"],
  NL: ["netherlands", "holland", "amsterdam", "rotterdam", "utrecht"],
  CA: ["canada", "toronto", "vancouver", "montreal", "ottawa"],
  IN: ["india", "bangalore", "bengaluru", "mumbai", "delhi", "hyderabad", "pune"],
  PK: ["pakistan", "karachi", "lahore", "islamabad"],
  TR: ["turkey", "turkiye", "istanbul", "ankara", "izmir"],
};

const foldedCountryTerms: Array<[string, string[]]> = Object.entries(COUNTRY_TERMS).map(
  ([country, terms]) => [country, terms.map((term) => paddedFoldedText(term).trim())],
);

export const resolveCountry = (location: string | null | undefined): string | null => {
  if (!location) return null;
  const padded = paddedFoldedText(location);
  if (padded.trim().length === 0) return null;
  for (const [country, terms] of foldedCountryTerms) {
    if (terms.some((term) => term.length > 0 && padded.includes(` ${term} `))) return country;
  }
  return null;
};

export const marketByCountry = (country: string | null): JobMarket | undefined =>
  MENA_MARKETS.find((market) => market.country === country);
