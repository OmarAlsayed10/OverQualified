import { createAction } from "@reduxjs/toolkit";
import type { CvBuilderState } from "./cvBuilderSlice";

export type BuilderSnapshot = Pick<CvBuilderState, "formData" | "template" | "fontScale" | "sectionGap" | "sectionOrder">;

export interface BuilderHistoryTransition {
  nextBuilder: BuilderSnapshot;
  currentBuilder: BuilderSnapshot;
}

export const builderSnapshotFrom = (builder: CvBuilderState | BuilderSnapshot): BuilderSnapshot => ({
  formData: builder.formData,
  template: builder.template,
  fontScale: builder.fontScale,
  sectionGap: builder.sectionGap,
  sectionOrder: builder.sectionOrder,
});

export const clearBuilderHistory = createAction("builderHistory/clearBuilderHistory");
export const recordBuilderSnapshot = createAction<BuilderSnapshot>("builderHistory/recordBuilderSnapshot");
export const restoreBuilderSnapshot = createAction<BuilderHistoryTransition>("builderHistory/restoreBuilderSnapshot");
export const reapplyBuilderSnapshot = createAction<BuilderHistoryTransition>("builderHistory/reapplyBuilderSnapshot");
