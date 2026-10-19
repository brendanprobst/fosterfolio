/**
 * @swagger
 * /pets/{id}/links:
 *   post:
 *     summary: Create a pet tracked link (kept on purpose; new links use POST /me/links)
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
 *         description: Links with view and inquiry totals
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
 *         description: linkId, channelKey, target, and petId
 *       404:
 *         description: Unknown code
 * /me/links:
 *   post:
 *     summary: Create a foster-me tracked link for the signed-in owner
 *     tags: [Tracked links]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Foster-me link created
 *       409:
 *         description: An active default link already exists
 *   get:
 *     summary: List every link for the owner, both targets, archived included
 *     tags: [Tracked links]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Links with target, petId, and pet name for pet links
 * /me/links/analytics:
 *   get:
 *     summary: Owner foster-me funnel and per-link stats
 *     tags: [Tracked links]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: range
 *         schema:
 *           type: string
 *           enum: [7d, 30d, all]
 *     responses:
 *       200:
 *         description: Funnel, byLink (null linkId is untagged), previewViewsByDay, and inquiriesByDay
 *       400:
 *         description: Invalid range
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
