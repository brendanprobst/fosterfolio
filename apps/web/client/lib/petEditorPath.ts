import { DEFAULT_POST_LOGIN_PATH, safeNextPath } from "@client/lib/safeNextPath";

export const PET_EDITOR_NEW_PATH = "/profile/pets/new";
export const PET_EDITOR_EDIT_PATH = "/profile/pets/edit";

function withFrom(path: string, from?: string): string {
  if (!from || from === "/profile") {
    return path;
  }
  const params = new URLSearchParams({ from });
  return `${path}?${params.toString()}`;
}

/** Create-pet page. Optional `from` is where Cancel/Save should return. */
export function petEditorNewHref(from?: string): string {
  return withFrom(PET_EDITOR_NEW_PATH, from);
}

/** Edit-pet page. `petId` is a query param so static export does not need a CloudFront sentinel. */
export function petEditorEditHref(petId: string, from?: string): string {
  const params = new URLSearchParams({ petId });
  if (from && from !== "/profile") {
    params.set("from", from);
  }
  return `${PET_EDITOR_EDIT_PATH}?${params.toString()}`;
}

/** Safe return path after save/cancel/delete. Defaults to `/profile`. */
export function petEditorReturnPath(raw: string | null): string {
  if (raw == null || raw === "") {
    return "/profile";
  }
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return "/profile";
  }
  const next = safeNextPath(raw);
  if (next === DEFAULT_POST_LOGIN_PATH && decoded !== "/") {
    return "/profile";
  }
  return next;
}
