import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import env from "../config/env";

const s3Client = new S3Client({
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
