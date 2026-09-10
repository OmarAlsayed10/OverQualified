import axios from 'axios';
import { AI_ENDPOINTS, JOB_ENDPOINTS } from '../../../constants/endpoints';
import type { CvVariant } from '../components/CvVariantResults';
import type { ApplicationPreparation, PreparationStepId, ScreeningAnswer } from './applicationWorkspace.types';

const stepIds: PreparationStepId[] = ['cvAnalysis', 'careerMatch', 'coverLetter', 'cvVariants', 'screeningAnswers'];

export const emptyPreparation = (): ApplicationPreparation => ({
  status: 'idle',
  steps: stepIds.map((id) => ({ id, status: 'pending' })),
});

interface PreparationInput {
  matchId: string;
  cvId?: string;
  cvFile?: File;
  cvName: string;
  cvText: string;
  jobTitle: string;
  jobDescription: string;
  language: 'en' | 'ar';
  current: ApplicationPreparation;
  restart?: boolean;
  persist: (preparation: ApplicationPreparation) => Promise<void>;
  onChange: (preparation: ApplicationPreparation) => void;
  onCoverLetter: (coverLetter: string) => void;
  onVariants: (variants: CvVariant[]) => void;
  onScreeningAnswers: (answers: ScreeningAnswer[]) => void;
}

const requestMessage = (error: unknown): string => {
  if (!axios.isAxiosError(error)) return 'Preparation failed.';
  const message = error.response?.data?.message;
  return typeof message === 'string' ? message : 'Preparation failed.';
};

export async function prepareApplication(input: PreparationInput): Promise<void> {
  let preparation: ApplicationPreparation = {
    ...(input.restart ? emptyPreparation() : input.current),
    cvSource: {
      type: input.cvFile ? 'upload' : 'saved',
      id: input.cvId,
      name: input.cvName,
      text: input.cvText,
    },
  };
  const appendCvSource = (form: FormData) => {
    if (input.cvFile) form.append('cv', input.cvFile);
    else if (input.cvId) form.append('cvId', input.cvId);
    else form.append('cvText', input.cvText);
  };
  const publish = async (next: ApplicationPreparation) => {
    preparation = { ...next, updatedAt: new Date().toISOString() };
    input.onChange(preparation);
    await input.persist(preparation);
  };
  const runStep = async (id: PreparationStepId, task: () => Promise<unknown>) => {
    if (!input.restart && preparation.steps.find((step) => step.id === id)?.status === 'completed') return;
    await publish({ ...preparation, status: 'running', steps: preparation.steps.map((step) => step.id === id ? { id, status: 'running' } : step) });
    try {
      const result = await task();
      const analysis = id === 'cvAnalysis'
        ? { cvAnalysis: result }
        : id === 'careerMatch'
          ? { careerMatch: result }
          : {};
      await publish({ ...preparation, ...analysis, steps: preparation.steps.map((step) => step.id === id ? { id, status: 'completed' } : step) });
    } catch (error) {
      await publish({ ...preparation, steps: preparation.steps.map((step) => step.id === id ? { id, status: 'failed', error: requestMessage(error) } : step) });
    }
  };

  await runStep('cvAnalysis', async () => {
    const form = new FormData();
    appendCvSource(form);
    form.append('language', input.language);
    return (await axios.post(AI_ENDPOINTS.analyze, form, { withCredentials: true })).data;
  });
  await runStep('careerMatch', async () => {
    const form = new FormData();
    appendCvSource(form);
    form.append('targetJobTitle', input.jobTitle);
    form.append('jobDescription', input.jobDescription);
    form.append('useLiveMarket', 'false');
    form.append('language', input.language);
    return (await axios.post(AI_ENDPOINTS.careerMatch, form, { withCredentials: true })).data;
  });
  await runStep('coverLetter', async () => {
    const response = await axios.post(JOB_ENDPOINTS.coverLetter(input.matchId), { language: input.language, cvText: input.cvText }, { withCredentials: true });
    input.onCoverLetter(response.data.coverLetter ?? '');
    return response.data;
  });
  await runStep('cvVariants', async () => {
    const response = await axios.post(JOB_ENDPOINTS.variants(input.matchId), { cvText: input.cvText }, { withCredentials: true });
    input.onVariants((response.data.variants ?? []).map((variant: CvVariant) => ({ ...variant, sentCount: variant.sentCount ?? 0, responseCount: variant.responseCount ?? 0 })));
    return response.data;
  });
  await runStep('screeningAnswers', async () => {
    const response = await axios.post(JOB_ENDPOINTS.screeningAnswers(input.matchId), { cvText: input.cvText }, { withCredentials: true });
    input.onScreeningAnswers(response.data.screeningAnswers ?? []);
    return response.data;
  });

  const failed = preparation.steps.some((step) => step.status === 'failed');
  await publish({ ...preparation, status: failed ? 'completed_with_errors' : 'completed' });
}
