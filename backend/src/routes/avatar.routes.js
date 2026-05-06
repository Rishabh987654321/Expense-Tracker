import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/errorHandler.js';
import { BlobServiceClient } from '@azure/storage-blob';
import env from '../config/env.js';

const router = Router();
router.use(requireAuth);

function getContainerClient() {
  if (!env.AZURE_STORAGE_CONNECTION_STRING) {
    throw new HttpError(503, 'Avatar storage is not configured');
  }
  const service = BlobServiceClient.fromConnectionString(env.AZURE_STORAGE_CONNECTION_STRING.trim());
  return service.getContainerClient(env.AZURE_BLOB_CONTAINER);
}

router.get('/:orgId/:file', async (req, res, next) => {
  try {
    const { orgId, file } = req.params;
    if (!orgId || !file) throw new HttpError(400, 'Missing avatar key');
    if (orgId !== req.user.orgId) throw new HttpError(403, 'You do not have access to this avatar');

    const blobPath = `${orgId}/${file}`;
    const cc = getContainerClient();
    const blob = cc.getBlockBlobClient(blobPath);
    const download = await blob.download();
    if (!download.readableStreamBody) throw new HttpError(404, 'Avatar not found');

    res.setHeader('Content-Type', download.contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', 'inline');
    return download.readableStreamBody.pipe(res);
  } catch (err) { next(err); }
});

export default router;

