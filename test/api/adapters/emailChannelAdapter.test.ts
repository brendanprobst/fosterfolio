import { EmailChannelAdapter } from "@api/infrastructure/adapters/email/EmailChannelAdapter";
import { Logger } from "@api/utils/logger";

describe("EmailChannelAdapter", () => {
  const message = {
    to: "foster@example.com",
    subject: "Fosterfolio inquiry about Mochi",
    text: "Hello",
    replyTo: "jamie@example.com",
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("passes the message through to the mailer", async () => {
    const send = jest.fn().mockResolvedValue(undefined);

    await new EmailChannelAdapter({ send }).send(message);

    expect(send).toHaveBeenCalledWith(message);
  });

  // dispatch() swallows send errors, so without this a broken SES setup fails silently.
  it("logs a failed send without the addresses, then rethrows", async () => {
    const warning = jest.spyOn(Logger, "warning").mockImplementation(() => {});
    const error = Object.assign(
      new Error(
        "Email address is not verified. The following identities failed the check in region US-EAST-1: foster@example.com, jamie@example.com",
      ),
      {
        name: "MessageRejected",
      },
    );
    const adapter = new EmailChannelAdapter({
      send: jest.fn().mockRejectedValue(error),
    });

    await expect(adapter.send(message)).rejects.toBe(error);

    expect(warning).toHaveBeenCalledTimes(1);
    const logged = warning.mock.calls[0]?.[0] ?? "";
    expect(logged).toContain("[email] send failed");
    expect(logged).toContain("MessageRejected");
    expect(logged).toContain("Email address is not verified.");
    expect(logged).toContain("US-EAST-1: [email], [email]");
    expect(logged).not.toContain("foster@example.com");
    expect(logged).not.toContain("jamie@example.com");
  });
});
