import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  HANDLE_SENTINEL_SEGMENT,
  PET_BIO_SENTINEL_ID,
} from "@client/lib/constants/petBioSentinel";

/**
 * Smoke-check the CloudFront viewer-request function source stays aligned with
 * the web sentinel id (runtime is cloudfront-js; we eval a tiny wrapper).
 */
describe("CloudFront vanity URL rewrite", () => {
  const source = readFileSync(
    resolve(
      __dirname,
      "../../../infra/terraform/cloudfront/functions/viewer_request_next_static_export.js",
    ),
    "utf8",
  );

  function rewrite(uri: string): string {
    // eslint-disable-next-line no-new-func -- evaluate CF function source against a stub event
    const fn = new Function(
      `${source}; return handler({ request: { uri: ${JSON.stringify(uri)} } }).uri;`,
    ) as () => string;
    return fn();
  }

  it("embeds the same sentinel id as the Next.js export", () => {
    expect(source).toContain(PET_BIO_SENTINEL_ID);
  });

  it("rewrites /@handle to the profile sentinel", () => {
    expect(rewrite("/@brendan")).toBe(`/${HANDLE_SENTINEL_SEGMENT}.html`);
  });

  it("rewrites /@handle/foster-me to the foster-me sentinel", () => {
    expect(rewrite("/@brendan/foster-me")).toBe(
      `/${HANDLE_SENTINEL_SEGMENT}/foster-me.html`,
    );
  });

  it("rewrites /@handle/pet/{id} to the pet sentinel", () => {
    expect(rewrite("/@brendan/pet/11111111-1111-1111-1111-111111111111")).toBe(
      `/${HANDLE_SENTINEL_SEGMENT}/pet/${PET_BIO_SENTINEL_ID}.html`,
    );
  });

  it("leaves static product routes untouched by the handle family", () => {
    expect(rewrite("/search")).toBe("/search.html");
    expect(rewrite("/profile")).toBe("/profile.html");
  });
});
