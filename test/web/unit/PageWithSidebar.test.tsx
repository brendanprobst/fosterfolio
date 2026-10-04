import { PageWithSidebar } from "@client/components/layout/PageWithSidebar";
import { SidebarPanelProvider } from "@client/components/layout/sidebarPanelContext";
import { ExpandableInquiryForm } from "@client/features/inquiries";
import { petSidebarMobileSummary } from "@client/pages/pets/PublicPetSidebar";
import { publicProfileMobileSummary } from "@client/pages/users/PublicProfileSidebar";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithQueryClient } from "./support/renderWithProviders";

function installMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe("pet and profile mobile summaries", () => {
  it("names the actions a visitor is about to open", () => {
    expect(
      petSidebarMobileSummary({
        isOwner: false,
        petName: "Mochi",
        fosterName: "Alex",
        variant: "permalink",
      }),
    ).toEqual({
      title: "Ask about Mochi",
      description: "See if Alex is fostering Mochi, and send them a message.",
    });
    expect(
      petSidebarMobileSummary({
        isOwner: false,
        petName: "Mochi",
        fosterName: "Alex",
        variant: "foster-me",
      }),
    ).toEqual({
      title: "Ask about Mochi",
      description: "Send Alex a message about adopting Mochi.",
    });
    expect(publicProfileMobileSummary(false, "Alex Foster")).toEqual({
      title: "Contact Alex Foster",
      description: "See who they’re fostering now, or send a message about adopting.",
    });
  });

  it("names the owner-only tools hidden in the panel", () => {
    expect(
      petSidebarMobileSummary({
        isOwner: true,
        petName: "Mochi",
        fosterName: "Alex",
        variant: "permalink",
      })?.description,
    ).toMatch(/edit this bio/i);
    expect(
      petSidebarMobileSummary({
        isOwner: true,
        petName: "Mochi",
        fosterName: "Alex",
        variant: "foster-me",
      })?.title,
    ).toBe("Your tools for Mochi");
    expect(
      petSidebarMobileSummary({
        isOwner: true,
        fosterName: "Alex",
        variant: "foster-me",
      }),
    ).toMatchObject({ title: "Share your Foster Me link" });
    expect(
      petSidebarMobileSummary({
        isOwner: false,
        fosterName: "Alex",
        variant: "foster-me",
      }),
    ).toBeNull();
    expect(publicProfileMobileSummary(true, "Alex")).toMatchObject({
      title: "Your page tools",
    });
  });
});

describe("PageWithSidebar", () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    if (originalMatchMedia) {
      window.matchMedia = originalMatchMedia;
    } else {
      delete (window as { matchMedia?: typeof window.matchMedia }).matchMedia;
    }
  });

  it("keeps the sidebar inline on a wide screen", () => {
    installMatchMedia(true);
    render(
      <PageWithSidebar
        mobileSummary={{ title: "Share your pages", description: "Preview and copy." }}
        sidebar={<p>Sidebar body</p>}
      >
        <p>Main body</p>
      </PageWithSidebar>,
    );

    expect(screen.getByText("Main body")).toBeInTheDocument();
    expect(screen.getByText("Sidebar body")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Open Share your pages" }),
    ).not.toBeInTheDocument();
  });

  it("opens the sidebar from a short summary on a narrow screen", () => {
    installMatchMedia(false);
    render(
      <PageWithSidebar
        mobileSummary={{ title: "Share your pages", description: "Preview and copy." }}
        sidebar={<p>Sidebar body</p>}
      >
        <p>Main body</p>
      </PageWithSidebar>,
    );

    expect(screen.queryByText("Sidebar body")).not.toBeInTheDocument();
    const launcher = screen.getByRole("button", { name: "Open Share your pages" });
    expect(launcher).toHaveTextContent("Preview and copy.");
    fireEvent.click(launcher);

    const dialog = screen.getByRole("dialog", { name: "Share your pages" });
    expect(dialog).toHaveTextContent("Sidebar body");
    expect(dialog).not.toHaveTextContent("Preview and copy.");
  });
});

describe("inquiry form in the side panel", () => {
  it("shows the fields so the form can be sent without a second dialog", () => {
    renderWithQueryClient(
      <SidebarPanelProvider>
        <ExpandableInquiryForm targetUserId="owner-1" targetPetId="pet-1" />
      </SidebarPanelProvider>,
    );

    expect(screen.getByLabelText("Your name")).toBeVisible();
    expect(screen.getByLabelText("Your email")).toBeVisible();
    expect(screen.getByLabelText("Message")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Expand" })).not.toBeInTheDocument();
    expect(
      screen.getByRole("form", { name: "Contact the foster" }).closest("[data-slot=card-content]"),
    ).not.toHaveClass("hidden");
  });
});
