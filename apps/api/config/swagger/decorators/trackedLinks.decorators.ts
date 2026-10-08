/**
 * @swagger
 * /pets/{id}/links:
 *   post:
 *     summary: Create a tracked link for a pet you own
 *     tags: [Tracked links]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Link created
 *       403:
 *         description: Not the pet owner
 *   get:
 *     summary: List tracked links for a pet, including archived
 *     tags: [Tracked links]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Links with zeroed view and inquiry totals
 * /links/{id}:
 *   patch:
 *     summary: Edit a link label or channel, or archive / unarchive it
 *     tags: [Tracked links]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Link updated
 *       403:
 *         description: Not the link owner
 *       404:
 *         description: Link not found
 * /links/resolve/{code}:
 *   get:
 *     summary: Resolve a tracked-link code for public attribution
 *     tags: [Tracked links]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: linkId, channelKey, and petId
 *       404:
 *         description: Unknown code
 * /me/channels:
 *   get:
 *     summary: Preset channels plus this owner's custom channels
 *     tags: [Tracked links]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Presets first, then custom pairs
 */

export const trackedLinksSwaggerDoc = '';
