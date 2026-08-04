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
 */

export const inquiriesSwaggerDoc = '';
