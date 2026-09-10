import { JobSubmissionStatus } from "@prisma/client";
import prisma from "../../lib/prisma";

interface JobSubmissionInput {
  userId: string;
  title: unknown;
  company: unknown;
  location: unknown;
  remote: unknown;
  url: unknown;
  description: unknown;
}

const text = (input: unknown, limit: number): string =>
  typeof input === "string" ? input.trim().slice(0, limit) : "";

const validUrl = (input: string): boolean => {
  try {
    return ["http:", "https:"].includes(new URL(input).protocol);
  } catch {
    return false;
  }
};

export async function submitJob(input: JobSubmissionInput) {
  const title = text(input.title, 180);
  const company = text(input.company, 180);
  const url = text(input.url, 2000);
  const description = text(input.description, 6000);
  if (title.length < 2 || company.length < 2 || description.length < 10 || !validUrl(url)) {
    throw new Error("INVALID_JOB_SUBMISSION");
  }
  return prisma.jobSubmission.create({
    data: {
      userId: input.userId,
      title,
      company,
      location: text(input.location, 180) || null,
      remote: input.remote === true,
      url,
      description,
    },
  });
}

export function pendingJobSubmissions() {
  return prisma.jobSubmission.findMany({
    where: { status: JobSubmissionStatus.PENDING },
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function reviewJobSubmission(id: string, action: unknown) {
  if (action !== "approve" && action !== "reject") throw new Error("INVALID_JOB_REVIEW");
  const submission = await prisma.jobSubmission.findUnique({ where: { id } });
  if (!submission) throw new Error("JOB_SUBMISSION_NOT_FOUND");
  if (submission.status !== JobSubmissionStatus.PENDING) throw new Error("JOB_SUBMISSION_REVIEWED");

  return prisma.$transaction(async (tx) => {
    if (action === "approve") {
      await tx.job.create({
        data: {
          source: "community",
          externalId: submission.id,
          title: submission.title,
          company: submission.company,
          location: submission.location,
          remote: submission.remote,
          url: submission.url,
          description: submission.description,
        },
      });
    }
    return tx.jobSubmission.update({
      where: { id },
      data: {
        status: action === "approve" ? JobSubmissionStatus.APPROVED : JobSubmissionStatus.REJECTED,
        reviewedAt: new Date(),
      },
    });
  });
}