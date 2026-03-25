/**
 * S3 Storage Utility
 *
 * Provides upload, presigned-URL generation, and delete operations for
 * AWS S3.  Used when USE_S3=true is set in the environment (ECS Fargate
 * deployments where the container filesystem is ephemeral).
 *
 * On ECS the IAM task role supplies credentials automatically — no
 * AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY needed in that environment.
 * For local development, set those vars in backend/.env.
 *
 * Usage:
 *   import { uploadToS3, getS3SignedUrl, deleteFromS3 } from '../utils/s3Storage';
 *
 *   // Upload a file from disk
 *   const s3Key = await uploadToS3(localFilePath, 'schools/34/abc.pdf', 'application/pdf');
 *
 *   // Generate a time-limited download URL (15 min)
 *   const url = await getS3SignedUrl(s3Key);
 *
 *   // Delete a file
 *   await deleteFromS3(s3Key);
 */

import fs from 'fs';
import path from 'path';
import { config } from '../config';
import logger from '../config/logger';

// Lazily import the AWS SDK so the app still boots when USE_S3=false and the
// SDK is not installed.  Add @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner
// to package.json to use this module.
async function getS3Client() {
    try {
        const { S3Client } = await import('@aws-sdk/client-s3');
        const clientConfig: Record<string, unknown> = {
            region: config.s3.region,
        };
        // Only supply explicit credentials in non-ECS environments (local dev).
        // On ECS, the task role provides them automatically via the metadata service.
        if (config.s3.accessKeyId && config.s3.secretAccessKey) {
            clientConfig.credentials = {
                accessKeyId: config.s3.accessKeyId,
                secretAccessKey: config.s3.secretAccessKey,
            };
        }
        return new S3Client(clientConfig);
    } catch {
        throw new Error(
            'AWS SDK not installed. Run: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner'
        );
    }
}

/**
 * Upload a local file to S3.
 * @param localPath  Absolute path to the file on disk.
 * @param s3Key      Destination key in the bucket (e.g. "schools/34/photo.jpg").
 * @param mimeType   MIME type for Content-Type header.
 * @returns          The S3 key on success.
 */
export async function uploadToS3(
    localPath: string,
    s3Key: string,
    mimeType: string,
): Promise<string> {
    if (!config.s3.enabled) throw new Error('S3 storage is not enabled (USE_S3=false).');
    if (!config.s3.bucket) throw new Error('S3_BUCKET is not configured.');

    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await getS3Client();
    const fileStream = fs.createReadStream(localPath);
    const fileSize = fs.statSync(localPath).size;

    await client.send(new PutObjectCommand({
        Bucket: config.s3.bucket,
        Key: s3Key,
        Body: fileStream,
        ContentType: mimeType,
        ContentLength: fileSize,
        // Server-side encryption with AWS-managed keys
        ServerSideEncryption: 'AES256',
        // Prevent public access — access is always via presigned URLs
        ACL: 'private',
    }));

    logger.info('File uploaded to S3', { s3Key, bucket: config.s3.bucket, size: fileSize });
    return s3Key;
}

/**
 * Generate a presigned URL valid for `expiresInSeconds` (default 15 min).
 * The URL can be used directly in a browser to download the file without
 * needing AWS credentials.
 */
export async function getS3SignedUrl(
    s3Key: string,
    expiresInSeconds = 900,
): Promise<string> {
    if (!config.s3.enabled) throw new Error('S3 storage is not enabled (USE_S3=false).');
    if (!config.s3.bucket) throw new Error('S3_BUCKET is not configured.');

    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    const client = await getS3Client();

    return getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: config.s3.bucket, Key: s3Key }),
        { expiresIn: expiresInSeconds },
    );
}

/**
 * Delete a file from S3.
 */
export async function deleteFromS3(s3Key: string): Promise<void> {
    if (!config.s3.enabled) throw new Error('S3 storage is not enabled (USE_S3=false).');
    if (!config.s3.bucket) throw new Error('S3_BUCKET is not configured.');

    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await getS3Client();

    await client.send(new DeleteObjectCommand({
        Bucket: config.s3.bucket,
        Key: s3Key,
    }));
    logger.info('File deleted from S3', { s3Key, bucket: config.s3.bucket });
}

/**
 * Build the S3 key for a school-scoped upload.
 * Mirrors the local filesystem convention: schools/{schoolId}/{filename}
 */
export function buildS3Key(schoolId: number, filename: string): string {
    return `schools/${schoolId}/${path.basename(filename)}`;
}
