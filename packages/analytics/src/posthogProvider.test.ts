import { PostHogProvider } from "./posthogProvider";

describe("PostHogProvider", () => {
  it("sends one HogQL query and maps a null city", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init: init ?? {} });
      return {
        ok: true,
        status: 200,
        text: async () => "",
        json: async () => ({
          columns: [
            "pet_id",
            "link_id",
            "channel_key",
            "city",
            "day",
            "views",
            "approx_visitors",
            "form_opens",
          ],
          results: [["pet-1", null, "direct", null, "2026-10-08", 3, 2, 1]],
        }),
      } as Response;
    }) as typeof fetch;

    const provider = new PostHogProvider({
      host: "https://us.posthog.com/",
      projectId: "42",
      personalApiKey: "phx_test",
      fetchImpl,
    });

    const rows = await provider.queryAggregates({ hogql: "select 1" });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://us.posthog.com/api/projects/42/query/");
    expect(calls[0]?.init.method).toBe("POST");
    const headers = calls[0]?.init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer phx_test");
    const body = JSON.parse(String(calls[0]?.init.body));
    expect(body.query.kind).toBe("HogQLQuery");
    expect(body.query.query).toBe("select 1");
    expect(rows).toEqual([
      {
        pet_id: "pet-1",
        link_id: null,
        channel_key: "direct",
        city: null,
        day: "2026-10-08",
        views: 3,
        approx_visitors: 2,
        form_opens: 1,
      },
    ]);
  });
});
