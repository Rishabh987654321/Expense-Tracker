import {
  BlobServiceClient,
} from '@azure/storage-blob';
import env from './env.js';

let blobService = null;
let containerClient = null;

function ensureClient() {
  if (containerClient) return containerClient;
  if (!env.AZURE_STORAGE_CONNECTION_STRING) {
    throw new Error('AZURE_STORAGE_CONNECTION_STRING is not configured');
  }
  // Avoid eagerly parsing/validating AccountKey ourselves. The Azure SDK will
  // validate the connection string when it makes requests.
  blobService = BlobServiceClient.fromConnectionString(env.AZURE_STORAGE_CONNECTION_STRING.trim());
  containerClient = blobService.getContainerClient(env.AZURE_BLOB_CONTAINER);
  return containerClient;
}

export function isBlobConfigured() {
  return Boolean(env.AZURE_STORAGE_CONNECTION_STRING);
}

export async function uploadReceipt({ buffer, contentType, blobPath }) {
  const cc = ensureClient();
  await cc.createIfNotExists();
  const block = cc.getBlockBlobClient(blobPath);
  await block.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: contentType },
  });
  return blobPath;
}

export async function deleteReceipt(blobPath) {
  if (!isBlobConfigured() || !blobPath) return;
  try {
    const cc = ensureClient();
    await cc.getBlockBlobClient(blobPath).deleteIfExists();
  } catch (err) {
    console.warn('[blob] delete failed:', err?.message);
  }
}

export function generateReceiptReadUrl(blobPath) {
  if (!blobPath) return null;
  // Private container: serve via authenticated backend route.
  // blobPath is `${orgId}/${filename}`
  const [orgId, file] = blobPath.split('/');
  if (!orgId || !file) return null;
  return `/api/receipts/${encodeURIComponent(orgId)}/${encodeURIComponent(file)}`;
}

export async function uploadAvatar({ buffer, contentType, blobPath }) {
  // Stored in the same private container as receipts.
  return uploadReceipt({ buffer, contentType, blobPath });
}

export async function deleteAvatar(blobPath) {
  return deleteReceipt(blobPath);
}

export function generateAvatarReadUrl(blobPath) {
  if (!blobPath) return null;
  const [orgId, file] = blobPath.split('/');
  if (!orgId || !file) return null;
  return `/api/avatars/${encodeURIComponent(orgId)}/${encodeURIComponent(file)}`;
}
