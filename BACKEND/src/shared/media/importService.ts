import multer, { FileFilterCallback, StorageEngine } from "multer";
import { Request } from "express";
import { UploadApiOptions, v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export type CloudinaryResourceType = "image" | "raw";

interface CloudinaryStorageConfig {
  resourceType: CloudinaryResourceType;
  uploadOptions: (file: Express.Multer.File) => UploadApiOptions;
}

export type CloudinaryDeliveryType = "upload" | "authenticated";

export interface CloudinaryAsset {
  url: string;
  resourceType: CloudinaryResourceType;
}

class CloudinaryMulterStorage implements StorageEngine {
  constructor(private readonly config: CloudinaryStorageConfig) {}

  _handleFile(
    _req: Request,
    file: Express.Multer.File,
    callback: (error?: any, info?: Partial<Express.Multer.File>) => void,
  ): void {
    let completed = false;
    const finish = (error?: any, info?: Partial<Express.Multer.File>) => {
      if (completed) return;
      completed = true;
      callback(error, info);
    };
    const upload = cloudinary.uploader.upload_stream(
      this.config.uploadOptions(file),
      (error, uploadedFile) => {
        if (error) return finish(error);
        if (!uploadedFile) {
          return finish(new Error("Cloudinary upload returned no result."));
        }
        finish(undefined, {
          filename: uploadedFile.public_id,
          path: uploadedFile.secure_url,
          size: uploadedFile.bytes,
        });
      },
    );
    file.stream.once("error", finish);
    file.stream.pipe(upload);
  }

  _removeFile(
    _req: Request,
    file: Express.Multer.File,
    callback: (error: Error | null) => void,
  ): void {
    if (!file.filename) return callback(null);
    cloudinary.uploader
      .destroy(file.filename, { resource_type: this.config.resourceType })
      .then(() => callback(null))
      .catch((error: Error) => callback(error));
  }
}

const sanitizedFilename = (filename: string): string =>
  filename.replace(/[^a-zA-Z0-9.\-_]/g, "");

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) => {
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only PDF and DOC/DOCX files are supported",
      ) as any,
      false,
    );
  }
};

export const uploadToMemory = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const mdFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) => {
  const allowedExtensions = [".md", ".markdown"];
  const fileName = file.originalname.toLowerCase();
  const isMdExt = allowedExtensions.some((ext) => fileName.endsWith(ext));

  if (isMdExt) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only Markdown (.md, .markdown) files are supported.",
      ) as any,
      false,
    );
  }
};

export const uploadMdToMemory = multer({
  storage: multer.memoryStorage(),
  fileFilter: mdFileFilter,
  limits: { fileSize: 500 * 1024 },
});

const avatarStorage = new CloudinaryMulterStorage({
  resourceType: "image",
  uploadOptions: (file) => ({
    folder: "avatars",
    format: "jpg",
    public_id: `${Date.now()}-${sanitizedFilename(file.originalname)}`,
  }),
});

const imageFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only images are supported") as any, false);
  }
};

export const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const paymentScreenshotStorage = new CloudinaryMulterStorage({
  resourceType: "image",
  uploadOptions: (file) => ({
    folder: "payment-screenshots",
    format: "jpg",
    type: "authenticated",
    public_id: `pay-${Date.now()}-${sanitizedFilename(file.originalname)}`,
  }),
});

export const uploadPaymentScreenshot = multer({
  storage: paymentScreenshotStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export function cloudinaryPublicIdFromUrl(
  assetUrl: string,
  resourceType: CloudinaryResourceType,
): string | null {
  try {
    const path = decodeURIComponent(new URL(assetUrl).pathname);
    let afterMarker: string | null = null;

    for (const marker of ["/upload/", "/authenticated/"]) {
      const idx = path.indexOf(marker);
      if (idx >= 0) {
        afterMarker = path.slice(idx + marker.length);
        break;
      }
    }

    if (!afterMarker) return null;

    const versionMatch = afterMarker.match(/(?:^|\/)v\d+\/(.+)$/);
    let publicId = versionMatch?.[1] ?? afterMarker;
    if (!publicId) return null;

    if (resourceType === "image") {
      publicId = publicId.replace(/\.[^/.]+$/, "");
    }

    return publicId || null;
  } catch {
    return null;
  }
}

// Delivery type is part of an asset's identity in Cloudinary: a public asset is not
// reachable, signable, or deletable as an authenticated one. The stored URL is the only
// record of which kind it is, so it is read back from there rather than assumed.
export const cloudinaryDeliveryTypeFromUrl = (
  assetUrl: string,
): CloudinaryDeliveryType =>
  assetUrl.includes("/authenticated/") ? "authenticated" : "upload";

export function signedScreenshotUrl(screenshotUrl: string): string | null {
  try {
    // Parsed first so a malformed value fails here rather than being mistaken for a legacy
    // asset and echoed straight back to the caller.
    const publicId = cloudinaryPublicIdFromUrl(screenshotUrl, "image");
    if (!publicId) return null;

    // Screenshots uploaded before private delivery are public assets. Signing one as
    // authenticated produces a URL that resolves to nothing, so the original is returned
    // until those assets are migrated in Cloudinary and their stored URLs rewritten.
    if (cloudinaryDeliveryTypeFromUrl(screenshotUrl) === "upload") {
      return screenshotUrl;
    }

    const expiresAt = Math.floor(Date.now() / 1000) + 15 * 60;
    return cloudinary.utils.private_download_url(publicId, "jpg", {
      resource_type: "image",
      type: "authenticated",
      expires_at: expiresAt,
    });
  } catch {
    return null;
  }
}

export const withSignedScreenshot = <T extends { screenshotUrl: string | null }>(
  payment: T,
): T => ({
  ...payment,
  screenshotUrl: payment.screenshotUrl
    ? signedScreenshotUrl(payment.screenshotUrl)
    : null,
});

export async function deleteCloudinaryAsset(asset: CloudinaryAsset): Promise<void> {
  const publicId = cloudinaryPublicIdFromUrl(asset.url, asset.resourceType);
  if (!publicId) {
    throw new Error("Could not identify the stored Cloudinary asset.");
  }

  await cloudinary.uploader.destroy(publicId, {
    resource_type: asset.resourceType,
    type: cloudinaryDeliveryTypeFromUrl(asset.url),
  });
}

export async function deleteCloudinaryAssets(
  assets: CloudinaryAsset[],
): Promise<void> {
  const uniqueAssets = Array.from(
    new Map(
      assets.map((asset) => [
        `${asset.resourceType}:${asset.url}`,
        asset,
      ]),
    ).values(),
  );

  await Promise.all(uniqueAssets.map(deleteCloudinaryAsset));
}

export const deleteImageFromCloudinary = async (
  imageUrl: string,
): Promise<boolean> => {
  await deleteCloudinaryAsset({ url: imageUrl, resourceType: "image" });
  return true;
};

export { cloudinary };
