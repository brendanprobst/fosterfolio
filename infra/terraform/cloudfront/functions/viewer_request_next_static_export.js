// Viewer-request rewrite for Next static export on S3 (REST origin + OAC).
// Extensionless paths like /profile must map to /profile.html.
//
// Pet bio and public profile deep links: /pets/{uuid} and /users/{uuid} must stay
// in the browser URL (QR / share) but fetch the single statically exported
// sentinel object. Keep this id in sync with
// apps/web/client/lib/constants/petBioSentinel.ts (PET_BIO_SENTINEL_ID).

var STATIC_EXPORT_SENTINEL_ID = "00000000-0000-0000-0000-000000000000";

function rewriteDynamicToSentinel(uri, prefix) {
  if (uri === prefix || uri === prefix + "/") {
    return prefix + "/" + STATIC_EXPORT_SENTINEL_ID + ".html";
  }
  if (uri.indexOf(prefix + "/") === 0) {
    var rest = uri.substring((prefix + "/").length);
    if (rest.indexOf("/") === -1 && rest.indexOf(".") === -1 && rest.length > 0) {
      return prefix + "/" + STATIC_EXPORT_SENTINEL_ID + ".html";
    }
    if (rest.charAt(rest.length - 1) === "/" && rest.indexOf(".") === -1) {
      var segment = rest.substring(0, rest.length - 1);
      if (segment.indexOf("/") === -1 && segment.length > 0) {
        return prefix + "/" + STATIC_EXPORT_SENTINEL_ID + ".html";
      }
    }
  }
  return null;
}

function handler(event) {
  var request = event.request;
  var uri = request.uri || "/";

  if (uri.startsWith("/_next/")) {
    return request;
  }

  var petsRewrite = rewriteDynamicToSentinel(uri, "/pets");
  if (petsRewrite) {
    request.uri = petsRewrite;
    return request;
  }

  var usersRewrite = rewriteDynamicToSentinel(uri, "/users");
  if (usersRewrite) {
    request.uri = usersRewrite;
    return request;
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
