import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import env from "../config/env";

export const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY.trim(),
  },
});

export async function getPresignedUploadUrl(fileName: string, fileType: string): Promise<{ uploadUrl: string; key: string }> {
  const key = `libraries/${Date.now()}_${fileName}`;
  const bucketName = env.S3_BUCKET_NAME.trim();

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: fileType,
  });

  // Presigned URL valid for 15 minutes
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

  return { uploadUrl, key };
}

export async function uploadFileToS3(buffer: Buffer, key: string, contentType: string): Promise<string> {
  const bucketName = env.S3_BUCKET_NAME.trim();
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await s3Client.send(command);
  return `https://${bucketName}.s3.${env.AWS_REGION.trim()}.amazonaws.com/${key}`;
}

export async function getPresignedDownloadUrl(urlOrKey: string | null | undefined): Promise<string> {
  if (!urlOrKey) return "";

  if (urlOrKey.startsWith("http://") || urlOrKey.startsWith("https://")) {
    const bucketName = env.S3_BUCKET_NAME.trim();
    const isS3Url = urlOrKey.includes(".amazonaws.com") || (bucketName && urlOrKey.includes(bucketName));

    if (!isS3Url) {
      return urlOrKey; // Return external non-S3 URLs (e.g., Unsplash) as is
    }

    if (urlOrKey.includes("X-Amz-Signature") || urlOrKey.includes("X-Amz-Algorithm")) {
      return urlOrKey; // Already presigned URL
    }

    try {
      const urlObj = new URL(urlOrKey);
      const key = decodeURIComponent(urlObj.pathname.slice(1));
      if (!key) return urlOrKey;
      return await generatePresignedGetUrl(key);
    } catch {
      return urlOrKey;
    }
  }

  return await generatePresignedGetUrl(urlOrKey);
}

async function generatePresignedGetUrl(key: string): Promise<string> {
  try {
    const bucketName = env.S3_BUCKET_NAME.trim();
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    // Presigned GET URL valid for 24 hours (86400 seconds)
    return await getSignedUrl(s3Client, command, { expiresIn: 86400 });
  } catch (error) {
    console.error("Error generating presigned download URL for key:", key, error);
    return key;
  }
}

