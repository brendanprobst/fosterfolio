/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get public user profile
 *     tags: [Users]
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
 *         description: Public user profile (no email/zip/lat/lng)
 *       404:
 *         description: User not found
 *   put:
 *     summary: Update own profile
 *     tags: [Users]
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
 *         description: Owner user profile
 *       403:
 *         description: Not the profile owner
 *       404:
 *         description: User not found
 * /users/{id}/pets:
 *   get:
 *     summary: List pets for a user
 *     tags: [Users]
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
 *         description: Pet list
 *       404:
 *         description: User not found
 */

export const usersSwaggerDoc = '';
