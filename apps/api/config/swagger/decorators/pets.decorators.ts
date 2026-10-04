/**
 * @swagger
 * /pets:
 *   post:
 *     summary: Create a pet
 *     tags: [Pets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Created pet
 *       400:
 *         description: Invalid input
 * /pets/{id}:
 *   get:
 *     summary: Get public pet bio (includes meta and updates)
 *     tags: [Pets]
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
 *         description: Pet with meta and updates
 *       404:
 *         description: Pet not found
 *   put:
 *     summary: Update owned pet
 *     tags: [Pets]
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
 *         description: Updated pet
 *       403:
 *         description: Not the pet owner
 *       404:
 *         description: Pet not found
 *   delete:
 *     summary: Soft-delete owned pet
 *     tags: [Pets]
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
 *       403:
 *         description: Not the pet owner
 *       404:
 *         description: Pet not found
 * /pets/{id}/updates:
 *   get:
 *     summary: List pet updates
 *     tags: [Pets]
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
 *         description: Pet updates
 *       404:
 *         description: Pet not found
 */

export const petsSwaggerDoc = '';
