/**
 * @swagger
 * /search:
 *   get:
 *     summary: Full-text search pets and users
 *     tags: [Search]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: '{ pets: [...], users: [...] }'
 *       400:
 *         description: Missing q
 */

export const searchSwaggerDoc = '';
