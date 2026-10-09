// Viewer-request rewrite for Next static export on S3 (REST origin + OAC).
// Extensionless paths like /profile must map to /profile.html.
//
// Vanity URLs: /@handle, /@handle/foster-me, and /@handle/pet/{id} must stay
// in the browser URL (QR / share) but fetch the single statically exported
// sentinel object. Keep this id in sync with
// apps/web/client/lib/constants/petBioSentinel.ts (PET_BIO_SENTINEL_ID).

var STATIC_EXPORT_SENTINEL_ID = "00000000-0000-0000-0000-000000000000";
var HANDLE_SENTINEL = "@" + STATIC_EXPORT_SENTINEL_ID;

function stripTrailingSlash(uri) {
  if (uri.length > 1 && uri.charAt(uri.length - 1) === "/") {
    return uri.substring(0, uri.length - 1);
  }
  return uri;
}

function rewriteHandleFamily(uri) {
  var path = stripTrailingSlash(uri);
  if (path.indexOf("/@") !== 0) {
    return null;
  }
  var rest = path.substring(2);
  if (rest.length === 0) {
    return null;
  }
  var slash = rest.indexOf("/");
  if (slash === -1) {
    if (rest.indexOf(".") !== -1) {
      return null;
    }
    return "/" + HANDLE_SENTINEL + ".html";
  }
  var after = rest.substring(slash + 1);
  if (after === "foster-me") {
    return "/" + HANDLE_SENTINEL + "/foster-me.html";
  }
  if (after.indexOf("pet/") === 0) {
    var petRest = after.substring(4);
    var petSlash = petRest.indexOf("/");
    if (petSlash === -1) {
      if (petRest.length > 0 && petRest.indexOf(".") === -1) {
        return "/" + HANDLE_SENTINEL + "/pet/" + STATIC_EXPORT_SENTINEL_ID + ".html";
      }
    } else {
      var petId = petRest.substring(0, petSlash);
      var section = petRest.substring(petSlash + 1);
      if (
        petId.length > 0 &&
        petId.indexOf(".") === -1 &&
        (section === "links" || section === "analytics")
      ) {
        return (
          "/" +
          HANDLE_SENTINEL +
          "/pet/" +
          STATIC_EXPORT_SENTINEL_ID +
          "/" +
          section +
          ".html"
        );
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

  var handleRewrite = rewriteHandleFamily(uri);
  if (handleRewrite) {
    request.uri = handleRewrite;
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
