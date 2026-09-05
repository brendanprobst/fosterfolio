import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PET_BIO_SENTINEL_ID } from "@client/lib/constants/petBioSentinel";

/**
 * Smoke-check the CloudFront viewer-request function source stays aligned with
 * the web sentinel id (runtime is cloudfront-js; we eval a tiny wrapper).
 */
describe("CloudFront pet bio rewrite", () => {
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

  it("rewrites /pets/{uuid} to the sentinel object", () => {
    expect(rewrite("/pets/11111111-1111-1111-1111-111111111111")).toBe(
      `/pets/${PET_BIO_SENTINEL_ID}.html`,
    );
  });

  it("rewrites /users/{uuid} to the sentinel object", () => {
    expect(rewrite("/users/11111111-1111-1111-1111-111111111111")).toBe(
      `/users/${PET_BIO_SENTINEL_ID}.html`,
    );
  });

  it("still maps ordinary extensionless routes to .html", () => {
    expect(rewrite("/profile")).toBe("/profile.html");
  });
});
