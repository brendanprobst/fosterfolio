import { useAuth, useRequireAuth } from "@client/auth";
import {
  archiveTrackedLink,
  createOwnerLink,
  fetchChannels,
  fetchOwnerLinkAnalytics,
  fetchOwnerLinks,
} from "@client/features/petInsights/petInsightsApi";
import type { OwnerLinkAnalytics, TrackedLinkItem } from "@client/features/petInsights/types";
import { useOwnUser } from "@client/features/users";
import { OwnerLinksPage } from "@client/pages/links";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import QRCode from "qrcode";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authSignedIn, renderWithQueryClient } from "./support/renderWithProviders";

vi.mock("@client/auth", () => ({
  useAuth: vi.fn(),
  useRequireAuth: vi.fn(),
}));

vi.mock("@client/features/users", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@client/features/users")>();
  return { ...actual, useOwnUser: vi.fn() };
});

vi.mock("@client/features/petInsights/petInsightsApi", () => ({
  archiveTrackedLink: vi.fn(),
  createOwnerLink: vi.fn(),
  fetchChannels: vi.fn(),
  fetchOwnerLinkAnalytics: vi.fn(),
  fetchOwnerLinks: vi.fn(),
}));

vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,qq") },
}));

const channels = [
  { key: "lawn_sign", name: "Lawn sign", isPreset: true },
  { key: "instagram", name: "Instagram", isPreset: true },
];

function link(overrides: Partial<TrackedLinkItem> = {}): TrackedLinkItem {
  return {
    id: "l-ig",
    target: "foster_me",
    petId: null,
    code: "igcode",
    channelKey: "instagram",
    channelName: "Instagram",
    label: null,
    archivedAt: null,
    createdAt: "2026-10-05T00:00:00.000Z",
    views: 0,
    inquiries: 0,
    ...overrides,
  };
}

const defaultLink = link({
  id: "l-def",
  code: "defcode",
  channelKey: "default",
  channelName: "Default",
  label: "Alex Foster's default link",
  createdAt: "2026-10-01T00:00:00.000Z",
});

const analytics: OwnerLinkAnalytics = {
  funnel: { previewViews: 12, petTaps: 5, inquiries: 2 },
  byLink: [
    { linkId: "l-def", previewViews: 8, petTaps: 3, inquiries: 2 },
    { linkId: null, previewViews: 4, petTaps: 2, inquiries: 0 },
  ],
  previewViewsByDay: [],
  inquiriesByDay: [],
};

describe("OwnerLinksPage", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(authSignedIn());
    vi.mocked(useRequireAuth).mockReturnValue({
      user: authSignedIn().user,
      loading: false,
      apiAuthAccepted: true,
    } as ReturnType<typeof useRequireAuth>);
    vi.mocked(useOwnUser).mockReturnValue({
      data: { id: "u1", handle: "alex", displayName: "Alex Foster" },
      isLoading: false,
    } as ReturnType<typeof useOwnUser>);
    vi.mocked(fetchChannels).mockResolvedValue(channels);
    vi.mocked(fetchOwnerLinkAnalytics).mockResolvedValue(analytics);
    vi.mocked(fetchOwnerLinks).mockResolvedValue([]);
    vi.mocked(createOwnerLink).mockReset();
    vi.mocked(archiveTrackedLink).mockReset();
  });

  it("prefetches every range and shows the owner funnel in the hero", async () => {
    renderWithQueryClient(<OwnerLinksPage />);

    const funnel = await screen.findByRole("list", { name: "Foster-me funnel" });
    expect(within(funnel).getByText("12")).toBeInTheDocument();
    expect(within(funnel).getByText("5")).toBeInTheDocument();
    expect(within(funnel).getByText("2")).toBeInTheDocument();
    expect(vi.mocked(fetchOwnerLinkAnalytics).mock.calls.map((call) => call[1]).sort()).toEqual([
      "30d",
      "7d",
      "all",
    ]);
  });

  it("pulses the Create button only while there are no active links", async () => {
    const { unmount } = renderWithQueryClient(<OwnerLinksPage />);
    expect(await screen.findByRole("region", { name: "No links yet" })).toBeInTheDocument();
    expect(screen.getByTestId("create-link-pulse")).toBeInTheDocument();
    unmount();

    vi.mocked(fetchOwnerLinks).mockResolvedValue([defaultLink]);
    renderWithQueryClient(<OwnerLinksPage />);
    expect(await screen.findByRole("article", { name: defaultLink.label! })).toBeInTheDocument();
    expect(screen.queryByTestId("create-link-pulse")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "No links yet" })).not.toBeInTheDocument();
  });

  it("in first-run mode offers only 'Create first link' and disables the other controls", async () => {
    renderWithQueryClient(<OwnerLinksPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Create link" }));

    const dialog = await screen.findByRole("dialog");
    const first = within(dialog).getByRole("button", { name: /create first link/i });
    const instagram = within(dialog).getByRole("button", { name: "Instagram" });
    expect(first.compareDocumentPosition(instagram) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(instagram).toBeDisabled();
    expect(within(dialog).getByLabelText("Custom channel")).toBeDisabled();
    expect(within(dialog).getByLabelText(/label/i)).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Create link" })).toBeDisabled();
  });

  it("creates the default link in the background, then walks through the intro", async () => {
    let resolveCreate: (value: TrackedLinkItem) => void = () => {};
    vi.mocked(createOwnerLink).mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve;
      }),
    );
    renderWithQueryClient(<OwnerLinksPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Create link" }));
    fireEvent.click(await screen.findByRole("button", { name: /create first link/i }));

    await waitFor(() =>
      expect(createOwnerLink).toHaveBeenCalledWith("test-token", { isDefault: true }),
    );
    // The create modal closed and the intro opened while the request is still in flight.
    const intro = await screen.findByRole("dialog");
    expect(within(intro).getByText("This is your default link to the pets you foster.")).toBeInTheDocument();
    expect(within(intro).queryByLabelText("Custom channel")).not.toBeInTheDocument();

    vi.mocked(fetchOwnerLinks).mockResolvedValue([defaultLink]);
    resolveCreate(defaultLink);

    fireEvent.click(within(intro).getByRole("button", { name: "Next" }));
    expect(await within(intro).findByText(/to see how adopters find you/)).toBeInTheDocument();
    fireEvent.click(within(intro).getByRole("button", { name: "Got it" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByRole("article", { name: defaultLink.label! })).toBeInTheDocument();
  });

  it("closes the intro and shows the error when the first link fails", async () => {
    vi.mocked(createOwnerLink).mockRejectedValue(new Error("You already have a default link."));
    renderWithQueryClient(<OwnerLinksPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Create link" }));
    fireEvent.click(await screen.findByRole("button", { name: /create first link/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("You already have a default link.");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("in normal mode always shows the custom channel input and creates from a chip", async () => {
    vi.mocked(fetchOwnerLinks).mockResolvedValue([defaultLink]);
    const created = link({ id: "l-new", label: "Story highlight" });
    vi.mocked(createOwnerLink).mockImplementation(async () => {
      vi.mocked(fetchOwnerLinks).mockResolvedValue([defaultLink, created]);
      return created;
    });
    renderWithQueryClient(<OwnerLinksPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Create link" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryByRole("button", { name: /create first link/i })).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText("Custom channel")).toBeEnabled();
    expect(
      within(dialog).getByText("Something else? e.g. Vet office, Shelter listing, Dog park board."),
    ).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Instagram" }));
    fireEvent.change(within(dialog).getByLabelText(/label/i), {
      target: { value: "Story highlight" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create link" }));

    await waitFor(() =>
      expect(createOwnerLink).toHaveBeenCalledWith("test-token", {
        channelKey: "instagram",
        label: "Story highlight",
      }),
    );
    const row = await screen.findByRole("article", { name: "Story highlight" });
    expect(row).toHaveAttribute("data-highlighted", "true");
  });

  it("sends a custom channel name instead of a chip when one is typed", async () => {
    vi.mocked(fetchOwnerLinks).mockResolvedValue([defaultLink]);
    vi.mocked(createOwnerLink).mockResolvedValue(link({ id: "l-vet", channelName: "Vet office" }));
    renderWithQueryClient(<OwnerLinksPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Create link" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Instagram" }));
    fireEvent.change(within(dialog).getByLabelText("Custom channel"), {
      target: { value: "Vet office" },
    });
    expect(within(dialog).getByRole("button", { name: "Instagram" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Create link" }));

    await waitFor(() =>
      expect(createOwnerLink).toHaveBeenCalledWith("test-token", {
        channelName: "Vet office",
        label: null,
      }),
    );
  });

  it("pins the default link, shows untagged visits under it, and tags URLs for foster-me", async () => {
    vi.mocked(fetchOwnerLinks).mockResolvedValue([
      link({ id: "l-ig", createdAt: "2026-10-05T00:00:00.000Z" }),
      defaultLink,
    ]);
    renderWithQueryClient(<OwnerLinksPage />);

    const defaultRow = await screen.findByRole("article", { name: defaultLink.label! });
    const rows = screen.getAllByRole("article").map((row) => row.getAttribute("aria-label"));
    expect(rows.slice(0, 3)).toEqual([defaultLink.label, "Untagged visits", "Instagram"]);

    expect(within(defaultRow).getByText("Default")).toBeInTheDocument();
    await waitFor(() =>
      expect(within(defaultRow).getByText(/preview views/)).toHaveTextContent(
        "8 preview views · 3 pet taps · 2 inquiries",
      ),
    );
    const untagged = screen.getByRole("article", { name: "Untagged visits" });
    expect(within(untagged).getByText(/preview views/)).toHaveTextContent(
      "4 preview views · 2 pet taps · 0 inquiries",
    );
    expect(within(untagged).queryByRole("button")).not.toBeInTheDocument();
    expect(
      await within(defaultRow).findByRole("img", { name: `QR code for ${defaultLink.label}` }),
    ).toBeInTheDocument();
    expect(QRCode.toDataURL).toHaveBeenCalledWith(
      `${window.location.origin}/@alex/foster-me?s=defcode`,
      expect.anything(),
    );
    expect(screen.queryByText(/original QR/i)).not.toBeInTheDocument();
  });

  it("collapses archived links and keeps legacy pet links read-only except Archive", async () => {
    vi.mocked(fetchOwnerLinks).mockResolvedValue([
      defaultLink,
      link({ id: "l-old", label: "Old flyer", archivedAt: "2026-10-03T00:00:00.000Z" }),
      link({
        id: "l-pet",
        target: "pet",
        petId: "pet-1",
        petName: "Mochi",
        channelKey: "lawn_sign",
        channelName: "Lawn sign",
        label: "Front yard",
      }),
    ]);
    vi.mocked(archiveTrackedLink).mockResolvedValue(link());
    renderWithQueryClient(<OwnerLinksPage />);

    expect(await screen.findByText("Archived links (1)")).toBeInTheDocument();
    expect(screen.getByText("Older pet-specific links (1)")).toBeInTheDocument();

    const legacy = screen.getByRole("article", { name: "Front yard" });
    expect(within(legacy).getByText("Lawn sign · Mochi")).toBeInTheDocument();
    expect(within(legacy).getAllByRole("button").map((button) => button.textContent)).toEqual([
      "Archive",
    ]);
    fireEvent.click(within(legacy).getByRole("button", { name: "Archive" }));
    await waitFor(() => expect(archiveTrackedLink).toHaveBeenCalledWith("test-token", "l-pet", true));

    const archived = screen.getByRole("article", { name: "Old flyer" });
    expect(within(archived).queryByRole("button", { name: "Copy link" })).not.toBeInTheDocument();
    fireEvent.click(within(archived).getByRole("button", { name: "Unarchive" }));
    await waitFor(() => expect(archiveTrackedLink).toHaveBeenCalledWith("test-token", "l-old", false));
  });
});
