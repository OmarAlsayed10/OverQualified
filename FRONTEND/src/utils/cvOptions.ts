import axios from "axios";
import { CV_ENDPOINTS } from "../constants/endpoints";
import { cvToText } from "./cvToText";
import { roleSuggestionsFromCv } from "./roleSuggestions";

export interface CvOption {
  id: string;
  title: string;
  text: string;
  isPrimary: boolean;
  roleSuggestions: string[];
}

export const loadCvOptions = async (): Promise<CvOption[]> => {
  const { data } = await axios.get(CV_ENDPOINTS.userCvs, { withCredentials: true });
  const cvs: Record<string, any>[] = Array.isArray(data) ? data : data.cvs ?? [];
  return cvs
    .map((cv, index) => ({
      id: cv._id ?? cv.id ?? String(index),
      title: cv.title || cv.personalInfo?.professionalTitle || `CV ${index + 1}`,
      text: cvToText(cv),
      isPrimary: Boolean(cv.isPrimary),
      roleSuggestions: roleSuggestionsFromCv(cv),
    }))
    .filter((option) => option.text.length > 0)
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
};
