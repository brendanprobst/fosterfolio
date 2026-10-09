/**
 * @swagger
 * /pets/{id}/analytics:
 *   get:
 *     summary: Owner analytics for a pet, read from the rollup
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: range
 *         schema:
 *           type: string
 *           enum: [7d, 30d, all]
 *           default: 30d
 *     responses:
 *       200:
 *         description: Funnel, channel, link, city, and daily view series
 *       400:
 *         description: Range is not 7d, 30d, or all
 *       403:
 *         description: Not the pet owner
 *       404:
 *         description: Pet not found
 * /pets/{id}/analytics/summary:
 *   get:
 *     summary: Last 7 days for the owner widget
 *     tags: [Analytics]
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
 *         description: Views, inquiries, and the channel with the most views
 *       403:
 *         description: Not the pet owner
 *       404:
 *         description: Pet not found
 */

export const analyticsSwaggerDoc = '';
