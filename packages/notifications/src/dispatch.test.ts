import type { EmailChannel, InAppChannel, NotificationPreferenceStore } from "./channels";
import { dispatch, UnknownNotificationTypeError } from "./dispatch";
import { registerType, resetNotificationTypes } from "./registry";
import type { NotificationRecord, OutboundEmail } from "./types";

function memoryChannel(): InAppChannel & { rows: NotificationRecord[] } {
  const rows: NotificationRecord[] = [];
  return {
    rows,
    async insert(input) {
      const row: NotificationRecord = {
        id: `n-${rows.length + 1}`,
        recipientId: input.recipientId,
        type: input.type,
        payload: input.payload,
        entityType: input.entityType,
        entityId: input.entityId,
        readAt: null,
        archivedAt: null,
        emailedAt: null,
        createdAt: "2026-10-08T00:00:00.000Z",
      };
      rows.push(row);
      return row;
    },
    async markEmailed(id, emailedAt) {
      const row = rows.find((item) => item.id === id);
      if (!row) throw new Error("missing");
      row.emailedAt = emailedAt;
      return row;
    },
  };
}

describe("notification dispatch", () => {
  beforeEach(() => {
    resetNotificationTypes();
    registerType({
      type: "inquiry_received",
      defaultEmailEnabled: true,
      emailTemplate: () => ({
        subject: "Inquiry",
        text: "Hello\n\n/settings/notifications",
        replyTo: "sender@example.com",
      }),
    });
  });

  it("writes an in-app row", async () => {
    const inApp = memoryChannel();
    const email: EmailChannel = { send: async () => undefined };
    const preferences: NotificationPreferenceStore = {
      getEmailEnabled: async () => null,
    };

    const result = await dispatch(
      { inApp, email, preferences },
      {
        recipientId: "user-1",
        recipientEmail: "foster@example.com",
        type: "inquiry_received",
        payload: { message: "Hi" },
        entityRef: { entityType: "inquiry", entityId: "inq-1" },
      },
    );

    expect(inApp.rows).toHaveLength(1);
    expect(result.notification.entityType).toBe("inquiry");
    expect(result.notification.entityId).toBe("inq-1");
  });

  it("skips email when the preference is off", async () => {
    const inApp = memoryChannel();
    const sent: OutboundEmail[] = [];
    const email: EmailChannel = {
      send: async (message) => {
        sent.push(message);
      },
    };
    const preferences: NotificationPreferenceStore = {
      getEmailEnabled: async () => false,
    };

    const result = await dispatch(
      { inApp, email, preferences },
      {
        recipientId: "user-1",
        recipientEmail: "foster@example.com",
        type: "inquiry_received",
        payload: {},
        entityRef: null,
      },
    );

    expect(sent).toHaveLength(0);
    expect(result.emailed).toBe(false);
    expect(result.notification.emailedAt).toBeNull();
  });

  it("sets emailed_at when email is on", async () => {
    const inApp = memoryChannel();
    const email: EmailChannel = { send: async () => undefined };
    const preferences: NotificationPreferenceStore = {
      getEmailEnabled: async () => null,
    };

    const result = await dispatch(
      { inApp, email, preferences },
      {
        recipientId: "user-1",
        recipientEmail: "foster@example.com",
        type: "inquiry_received",
        payload: {},
        entityRef: null,
      },
    );

    expect(result.emailed).toBe(true);
    expect(result.notification.emailedAt).toEqual(expect.any(String));
  });

  it("rejects an unknown type", async () => {
    const inApp = memoryChannel();
    const email: EmailChannel = { send: async () => undefined };
    const preferences: NotificationPreferenceStore = {
      getEmailEnabled: async () => null,
    };

    await expect(
      dispatch(
        { inApp, email, preferences },
        {
          recipientId: "user-1",
          recipientEmail: "foster@example.com",
          type: "not_a_type",
          payload: {},
          entityRef: null,
        },
      ),
    ).rejects.toBeInstanceOf(UnknownNotificationTypeError);
    expect(inApp.rows).toHaveLength(0);
  });
});
