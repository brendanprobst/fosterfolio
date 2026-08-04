// Viewer-request rewrite for Next static export on S3 (REST origin + OAC).
// Extensionless paths like /profile must map to /profile.html.
//
// Pet bio deep links: /pets/{uuid} must stay in the browser URL (QR / share) but
// fetch the single statically exported sentinel object. Keep this id in sync with
// apps/web/client/lib/constants/petBioSentinel.ts (PET_BIO_SENTINEL_ID).

var PET_BIO_SENTINEL_ID = "00000000-0000-0000-0000-000000000000";

function handler(event) {
  var request = event.request;
  var uri = request.uri || "/";

  if (uri.startsWith("/_next/")) {
    return request;
  }

  // /pets/{anything} → sentinel HTML (including trailing slash forms).
  if (uri === "/pets" || uri === "/pets/") {
    request.uri = "/pets/" + PET_BIO_SENTINEL_ID + ".html";
    return request;
  }
  if (uri.indexOf("/pets/") === 0) {
    var rest = uri.substring("/pets/".length);
    if (rest.indexOf("/") === -1 && rest.indexOf(".") === -1 && rest.length > 0) {
      request.uri = "/pets/" + PET_BIO_SENTINEL_ID + ".html";
      return request;
    }
    if (rest.charAt(rest.length - 1) === "/" && rest.indexOf(".") === -1) {
      var segment = rest.substring(0, rest.length - 1);
      if (segment.indexOf("/") === -1 && segment.length > 0) {
        request.uri = "/pets/" + PET_BIO_SENTINEL_ID + ".html";
        return request;
      }
    }
  }

  if (uri.includes(".")) {
    return request;
  }

  if (uri.endsWith("/")) {
    request.uri = uri + "index.html";
    return request;
  }

  request.uri = uri + ".html";
  return request;
}
