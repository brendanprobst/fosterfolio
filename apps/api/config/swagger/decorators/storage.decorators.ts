/**
 * @swagger
 * /storage/sign:
 *   post:
 *     summary: Create a signed upload URL (enforces per-user storage cap)
 *     tags: [Storage]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: contentType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [image/jpeg, image/png, image/webp, image/gif]
 *       - in: query
 *         name: contentLength
 *         required: false
 *         schema:
 *           type: integer
 *         description: Optional byte size so the API can reject oversized uploads before signing
 *     responses:
 *       200:
 *         description: '{ uploadUrl, publicUrl, path, contentType, usedBytes, capBytes }'
 *       400:
 *         description: Invalid filename or content type
 *       413:
 *         description: STORAGE_CAP_EXCEEDED
 */

export const storageSwaggerDoc = '';
