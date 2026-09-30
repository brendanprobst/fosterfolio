/**
 * Marks chrome that only the signed-in owner sees on an otherwise public page.
 * Full-width caption — do not put this in `CardAction`; the badge is too wide
 * for a sidebar and squeezes the title/description.
 */
export function OwnerOnlyLabel() {
  return (
    <p className="text-muted-foreground text-xs font-medium">Visible only to you</p>
  );
}
