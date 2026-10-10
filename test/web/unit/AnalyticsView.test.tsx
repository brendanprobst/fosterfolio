import { AnalyticsView } from "@client/pages/pets/AnalyticsView";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

const emptyAnalytics = {
  funnel: { views: 0, formOpens: 0, inquiries: 0, conversionRate: null },
  byChannel: [],
  byLink: [],
  byCity: [],
  viewsByDay: [],
};

describe("AnalyticsView", () => {
  it("asks for a first tracked link when the pet has none", () => {
    render(
      <AnalyticsView
        petName="Mochi"
        linksHref="/@alex/pet/pet-1/links"
        adopted={false}
        links={[]}
        channels={[]}
        analytics={emptyAnalytics}
      />,
    );
    expect(
      screen.getByText(/Create your first tracked link to see which channels work best/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Manage links" })).toHaveAttribute(
      "href",
      "/@alex/pet/pet-1/links",
    );
    expect(screen.queryByText(/approx/i)).not.toBeInTheDocument();
  });

  it("shows the adopted banner and keeps zero-total charts", () => {
    render(
      <AnalyticsView
        petName="Mochi"
        linksHref="/@alex/pet/pet-1/links"
        adopted
        channels={[{ key: "lawn_sign", name: "Lawn sign", isPreset: true }]}
        links={[
          {
            id: "a",
            petId: "pet-1",
            code: "aaaaaa",
            channelKey: "lawn_sign",
            channelName: "Lawn sign",
            label: null,
            archivedAt: null,
            views: 0,
            inquiries: 0,
          },
        ]}
        analytics={{
          ...emptyAnalytics,
          byChannel: [{ channelKey: "direct", views: 0, inquiries: 0 }],
          viewsByDay: [{ day: "2026-10-01", views: 0 }],
        }}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Final results — Mochi was adopted 🎉");
    expect(screen.getByText("Direct / original QR")).toBeInTheDocument();
    expect(screen.getByText("Views by week")).toBeInTheDocument();
    expect(
      screen.queryByText(/Create your first tracked link/),
    ).not.toBeInTheDocument();
  });
});
