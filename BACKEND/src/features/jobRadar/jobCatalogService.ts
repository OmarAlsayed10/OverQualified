import { JobRoleSuggestionStatus, Prisma } from "@prisma/client";
import prisma from "../../lib/prisma";

const normalizedName = (input: unknown, maxLength = 80): string =>
  typeof input === "string"
    ? input.trim().replace(/\s+/g, " ").slice(0, maxLength)
    : "";

const requiredLocalizedNames = (
  input: { name: unknown; nameAr: unknown },
  errorCode: string,
): { name: string; nameAr: string } => {
  const name = normalizedName(input.name);
  const nameAr = normalizedName(input.nameAr);
  if (name.length < 2 || nameAr.length < 2) throw new Error(errorCode);
  return { name, nameAr };
};

export const listActiveJobCatalog = () =>
  prisma.jobCategory.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      nameAr: true,
      roles: {
        where: { active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, nameAr: true },
      },
    },
  });

export const selectedJobRoles = async (roleIds: unknown): Promise<{ id: string; name: string }[]> => {
  if (!Array.isArray(roleIds)) return [];
  const uniqueIds = [...new Set(roleIds.filter((id): id is string => typeof id === "string"))];
  if (uniqueIds.length === 0 || uniqueIds.length > 5) return [];
  return prisma.jobRole.findMany({
    where: { id: { in: uniqueIds }, active: true, category: { active: true } },
    select: { id: true, name: true },
  });
};

export const submitJobRoleSuggestion = async (request: {
  userId: string;
  categoryName: unknown;
  roleName: unknown;
  note: unknown;
}) => {
  const categoryName = normalizedName(request.categoryName);
  const roleName = normalizedName(request.roleName);
  const note = normalizedName(request.note, 500) || null;
  if (categoryName.length < 2 || roleName.length < 2) throw new Error("INVALID_SUGGESTION");

  const existing = await prisma.jobRoleSuggestion.findFirst({
    where: {
      userId: request.userId,
      status: JobRoleSuggestionStatus.PENDING,
      categoryName: { equals: categoryName, mode: "insensitive" },
      roleName: { equals: roleName, mode: "insensitive" },
    },
  });
  if (existing) return existing;

  return prisma.jobRoleSuggestion.create({
    data: { userId: request.userId, categoryName, roleName, note },
  });
};

export const listAdminJobCatalog = () =>
  prisma.jobCategory.findMany({
    orderBy: { name: "asc" },
    include: { roles: { orderBy: { name: "asc" } } },
  });

export const createJobCategory = (input: { name: unknown; nameAr: unknown }) => {
  const localizedNames = requiredLocalizedNames(input, "INVALID_CATEGORY");
  return prisma.jobCategory.create({ data: localizedNames });
};

export const updateJobCategory = (
  id: string,
  input: { name?: unknown; nameAr?: unknown; active?: unknown },
) => {
  const name = input.name === undefined ? undefined : normalizedName(input.name);
  const nameAr = input.nameAr === undefined ? undefined : normalizedName(input.nameAr);
  if (name !== undefined && name.length < 2) throw new Error("INVALID_CATEGORY");
  if (nameAr !== undefined && nameAr.length < 2) throw new Error("INVALID_CATEGORY");
  return prisma.jobCategory.update({
    where: { id },
    data: { name, nameAr, active: typeof input.active === "boolean" ? input.active : undefined },
  });
};

export const createJobRole = (
  categoryId: string,
  input: { name: unknown; nameAr: unknown },
) => {
  const localizedNames = requiredLocalizedNames(input, "INVALID_ROLE");
  return prisma.jobRole.create({ data: { categoryId, ...localizedNames } });
};

export const updateJobRole = (
  id: string,
  input: { name?: unknown; nameAr?: unknown; active?: unknown },
) => {
  const name = input.name === undefined ? undefined : normalizedName(input.name);
  const nameAr = input.nameAr === undefined ? undefined : normalizedName(input.nameAr);
  if (name !== undefined && name.length < 2) throw new Error("INVALID_ROLE");
  if (nameAr !== undefined && nameAr.length < 2) throw new Error("INVALID_ROLE");
  return prisma.jobRole.update({
    where: { id },
    data: { name, nameAr, active: typeof input.active === "boolean" ? input.active : undefined },
  });
};

export const listRoleSuggestions = (statusInput: unknown) => {
  const status = typeof statusInput === "string" && statusInput in JobRoleSuggestionStatus
    ? statusInput as JobRoleSuggestionStatus
    : JobRoleSuggestionStatus.PENDING;
  return prisma.jobRoleSuggestion.findMany({
    where: { status },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
  });
};

const categoryForApproval = async (
  tx: Prisma.TransactionClient,
  request: {
    suggestionCategory: string;
    categoryId: unknown;
    categoryName: unknown;
    categoryNameAr: unknown;
  },
) => {
  if (typeof request.categoryId === "string" && request.categoryId) {
    const category = await tx.jobCategory.findUnique({ where: { id: request.categoryId } });
    if (!category) throw new Error("CATEGORY_NOT_FOUND");
    return category;
  }

  const name = normalizedName(request.categoryName) || request.suggestionCategory;
  const existing = await tx.jobCategory.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (existing) return existing;

  const nameAr = normalizedName(request.categoryNameAr);
  if (name.length < 2 || nameAr.length < 2) throw new Error("INVALID_CATEGORY");
  return tx.jobCategory.create({ data: { name, nameAr } });
};

export const reviewRoleSuggestion = async (request: {
  id: string;
  action: unknown;
  categoryId: unknown;
  categoryName: unknown;
  categoryNameAr: unknown;
  roleName: unknown;
  roleNameAr: unknown;
}) => prisma.$transaction(async (tx) => {
  const suggestion = await tx.jobRoleSuggestion.findUnique({ where: { id: request.id } });
  if (!suggestion) throw new Error("SUGGESTION_NOT_FOUND");
  if (suggestion.status !== JobRoleSuggestionStatus.PENDING) throw new Error("SUGGESTION_REVIEWED");

  if (request.action === "reject") {
    return tx.jobRoleSuggestion.update({
      where: { id: request.id },
      data: { status: JobRoleSuggestionStatus.REJECTED, reviewedAt: new Date() },
    });
  }
  if (request.action !== "approve") throw new Error("INVALID_REVIEW_ACTION");

  const category = await categoryForApproval(tx, {
    suggestionCategory: suggestion.categoryName,
    categoryId: request.categoryId,
    categoryName: request.categoryName,
    categoryNameAr: request.categoryNameAr,
  });
  const roleName = normalizedName(request.roleName) || suggestion.roleName;
  const roleNameAr = normalizedName(request.roleNameAr);
  if (roleName.length < 2 || roleNameAr.length < 2) throw new Error("INVALID_ROLE");

  const existingRole = await tx.jobRole.findFirst({
    where: { categoryId: category.id, name: { equals: roleName, mode: "insensitive" } },
  });
  const role = existingRole ?? await tx.jobRole.create({
    data: { categoryId: category.id, name: roleName, nameAr: roleNameAr },
  });
  const reviewed = await tx.jobRoleSuggestion.update({
    where: { id: request.id },
    data: { status: JobRoleSuggestionStatus.APPROVED, reviewedAt: new Date() },
  });
  return { suggestion: reviewed, category, role };
});