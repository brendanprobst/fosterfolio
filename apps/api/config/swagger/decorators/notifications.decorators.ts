/**
 * @swagger
 * /me/notifications:
 *   get:
 *     summary: Inquiry inbox for the signed-in user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [unread, all, archived]
 *           default: unread
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *       - in: query
 *         name: petId
 *         description: Only inquiries about this pet
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Page of notifications
 * /me/notifications/unread-count:
 *   get:
 *     summary: Unread inbox count
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Count of unread, unarchived notifications
 * /me/notifications/{id}:
 *   patch:
 *     summary: Mark a notification read or archived
 *     tags: [Notifications]
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
 *         description: Updated notification
 *       404:
 *         description: Not found for this recipient
 * /me/notification-preferences:
 *   get:
 *     summary: Email preferences for registered notification types
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preferences, using the registered default when no row exists
 *   put:
 *     summary: Set email on or off for a notification type
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Saved preference
 *       400:
 *         description: Unknown type
 */
export {};
