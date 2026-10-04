/**
 * @swagger
 * /posts:
 *   get:
 *     summary: Home feed (keyset pagination)
 *     tags: [Posts]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: Opaque cursor from previous page (createdAt,id)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Feed page with items and nextCursor
 *   post:
 *     summary: Create a general or pet_update post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Created post
 *       400:
 *         description: Invalid input
 * /posts/{id}:
 *   get:
 *     summary: Get a post
 *     tags: [Posts]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Post
 *       404:
 *         description: Not found
 *   put:
 *     summary: Update owned post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Updated
 *       403:
 *         description: Not author
 *   delete:
 *     summary: Soft-delete owned post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Deleted
 */

export const postsSwaggerDoc = '';
