import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/errorHandler.js';
import { BlobServiceClient } from '@azure/storage-blob';
import env from '../config/env.js';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';

const router = Router();
// Receipts are fetched from a private blob container.
// Use JWT orgId for authorization (do not require tenant subdomain / header).
router.use(requireAuth);

const MIME_BY_EXT = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

function getContainerClient() {
  if (!env.AZURE_STORAGE_CONNECTION_STRING) {
    throw new HttpError(503, 'Receipt storage is not configured');
  }
  const service = BlobServiceClient.fromConnectionString(env.AZURE_STORAGE_CONNECTION_STRING.trim());
  return service.getContainerClient(env.AZURE_BLOB_CONTAINER);
}

// Stream a receipt from a private Azure Blob container.
// Key format: `${orgId}/${filename}`
router.get('/:orgId/:file', async (req, res, next) => {
  try {
    const { orgId, file } = req.params;
    if (!orgId || !file) throw new HttpError(400, 'Missing receipt key');

    // Tenant isolation: orgId in URL must match JWT orgId.
    if (orgId !== req.user.orgId) {
      throw new HttpError(403, 'You do not have access to this receipt');
    }

    const blobPath = `${orgId}/${file}`;
    const cc = getContainerClient();
    const blob = cc.getBlockBlobClient(blobPath);

    try {
      const download = await blob.download();
      if (!download.readableStreamBody) throw new HttpError(404, 'Receipt not found');

      const contentType = download.contentType || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', 'inline');
      return download.readableStreamBody.pipe(res);
    } catch (err) {
      // Some older records may point to receipts stored on local disk from
      // earlier dev iterations. Fallback to local filesystem if Azure blob is missing.
      if (err?.statusCode === 404 || err?.code === 'BlobNotFound') {
        const localPath = path.join(process.cwd(), 'uploads', 'receipts', blobPath);
        try {
          await fs.access(localPath);
          const ext = path.extname(localPath).toLowerCase();
          res.setHeader('Content-Type', MIME_BY_EXT[ext] || 'application/octet-stream');
          res.setHeader('Content-Disposition', 'inline');
          return createReadStream(localPath).pipe(res);
        } catch {
          throw new HttpError(404, 'Receipt not found');
        }
      }
      throw err;
    }
  } catch (err) {
    return next(err);
  }
});

export default router;

