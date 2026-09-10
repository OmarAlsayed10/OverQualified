import {
  combineReducers,
  configureStore,
  createAction,
  type Middleware,
} from "@reduxjs/toolkit";
import { savedCVsSlice } from "./slices/savedCVsSlice";
import { generateContentSlice } from "./slices/generateContentSlice";
import { cvTemplateSlice } from "./slices/cvTemplateSlice";
import { cvScoreSlice } from "./slices/cvScoreSlice";
import { cvAnalyzeSlice } from "./slices/cvAnalyzeSlice";
import { paymentSlice } from "./slices/paymentSlice";
import cvBuilderReducer, {
  addArrayItem,
  addCustomSection,
  hydrateBuilderDraft,
  moveCvSection,
  removeArrayItem,
  removeCustomSection,
  renameCustomSection,
  setCustomSectionItems,
  setFontScale,
  setSectionOrder,
  setTemplate,
  updateArraySection,
  updateFormData,
  updateSection,
} from "./slices/cvBuilderSlice";
import cvAdjustReducer from "./slices/cvAdjustSlice";
import fieldHistoryReducer from "./slices/fieldHistorySlice";
import builderHistoryReducer from "./slices/builderHistorySlice";
import { builderSnapshotFrom, recordBuilderSnapshot } from "./slices/builderHistoryActions";

export const resetStore = createAction("app/reset");

const appReducer = combineReducers({
  savedCVs: savedCVsSlice.reducer,
  generateContent: generateContentSlice.reducer,
  cvTemplate: cvTemplateSlice.reducer,
  cvScore: cvScoreSlice.reducer,
  cvAnalyze: cvAnalyzeSlice.reducer,
  payment: paymentSlice.reducer,
  cvBuilder: cvBuilderReducer,
  cvAdjust: cvAdjustReducer,
  fieldHistory: fieldHistoryReducer,
  builderHistory: builderHistoryReducer,
});

const rootReducer: typeof appReducer = (state, action) =>
  appReducer(resetStore.match(action) ? undefined : state, action);

const DRAFT_KEY = "cvBuilderDraft";

const readDraft = () => {
  try {
    const restored = hydrateBuilderDraft(localStorage.getItem(DRAFT_KEY));
    return restored ? { cvBuilder: restored } : undefined;
  } catch {
    return undefined;
  }
};

const recordedBuilderActions = new Set<string>([
  addArrayItem.type,
  addCustomSection.type,
  moveCvSection.type,
  removeArrayItem.type,
  removeCustomSection.type,
  renameCustomSection.type,
  setCustomSectionItems.type,
  setFontScale.type,
  setSectionOrder.type,
  setTemplate.type,
  updateArraySection.type,
  updateFormData.type,
  updateSection.type,
]);

const builderHistoryMiddleware: Middleware<{}, ReturnType<typeof appReducer>> =
  (storeApi) => (next) => (action) => {
    const previousBuilder = builderSnapshotFrom(storeApi.getState().cvBuilder);
    const dispatchedAction = action as { type?: string };
    const response = next(action);
    if (dispatchedAction.type && recordedBuilderActions.has(dispatchedAction.type)) {
      storeApi.dispatch(recordBuilderSnapshot(previousBuilder));
    }
    return response;
  };

const store = configureStore({
  reducer: rootReducer,
  preloadedState: readDraft(),
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(builderHistoryMiddleware),
});

// The in-progress CV lives only in memory, so a refresh would wipe unsaved edits without this.
let lastBuilder = store.getState().cvBuilder;
store.subscribe(() => {
  const builder = store.getState().cvBuilder;
  if (builder === lastBuilder) return;
  lastBuilder = builder;
  const { formData, currentCvId, title, template, fontScale, sectionGap, sectionOrder } = builder;
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ formData, currentCvId, title, template, fontScale, sectionGap, sectionOrder }));
  } catch {
    // Quota exceeded or storage disabled — drafts simply stop persisting.
  }
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
export default store;
