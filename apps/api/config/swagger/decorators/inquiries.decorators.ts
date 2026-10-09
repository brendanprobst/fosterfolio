/**
 * @swagger
 * /inquiries:
 *   post:
 *     summary: Submit a public inquiry (persists then emails foster)
 *     tags: [Inquiries]
 *     security: []
 *     responses:
 *       201:
 *         description: Inquiry saved and email attempted
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Target user not found
 *       502:
 *         description: Saved but email failed
 * /inquiries/{id}/self-reported-source:
 *   patch:
 *     summary: Record a one-time self-reported source with the create token
 *     tags: [Inquiries]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Source saved
 *       400:
 *         description: Token missing, expired, already used, or unknown option
 */

export const inquiriesSwaggerDoc = '';
