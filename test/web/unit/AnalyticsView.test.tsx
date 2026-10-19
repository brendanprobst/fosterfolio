import { AnalyticsView } from "@client/pages/pets/AnalyticsView";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

const emptyAnalytics = {
  funnel: { views: 0, formOpens: 0, inquiries: 0, conversionRate: null },
  byChannel: [],
  byLink: [],
  byCity: [],
  viewsByDay: [],
  inquiriesByDay: [],
};

describe("AnalyticsView", () => {
  it("asks for a first tracked link when the pet has none", () => {
    render(
      <AnalyticsView
        petName="Mochi"
        adopted={false}
        links={[]}
        channels={[]}
        analytics={emptyAnalytics}
        range="30d"
      />,
    );
    expect(
      screen.getByText(/Create your first tracked link to see which channels work best/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Links & analytics" })).toHaveAttribute(
      "href",
      "/profile/links",
    );
    expect(screen.queryByText(/approx/i)).not.toBeInTheDocument();
  });

  it("shows the adopted banner and keeps zero-total charts", () => {
    render(
      <AnalyticsView
        petName="Mochi"
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
        range="30d"
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Final results — Mochi was adopted 🎉");
    expect(screen.getAllByText("Direct / original QR").length).toBeGreaterThan(0);
    expect(screen.getByText("Views and inquiries by week")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Views by channel" })).toHaveTextContent(
      "Direct / original QR",
    );
    expect(screen.getByRole("table", { name: "Inquiries by channel" })).toHaveTextContent(
      "Direct / original QR",
    );
    expect(
      screen.queryByText(/Create your first tracked link/),
    ).not.toBeInTheDocument();
  });

  it("names link rows from the owner's links, tags foster-me ones, and links to the funnel", () => {
    render(
      <AnalyticsView
        petName="Mochi"
        adopted={false}
        channels={[{ key: "lawn_sign", name: "Lawn sign", isPreset: true }]}
        links={[
          {
            id: "fm",
            target: "foster_me",
            petId: null,
            code: "fmcode",
            channelKey: "instagram",
            channelName: "Instagram",
            label: "Story highlight",
            archivedAt: null,
            views: 0,
            inquiries: 0,
          },
          {
            id: "pet",
            target: "pet",
            petId: "pet-1",
            code: "petcode",
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
          funnel: { views: 9, formOpens: 0, inquiries: 1, conversionRate: 0.11 },
          byLink: [
            { linkId: "fm", channelKey: "instagram", views: 6, inquiries: 1 },
            { linkId: "pet", channelKey: "lawn_sign", views: 2, inquiries: 0 },
            { linkId: "gone", channelKey: "", views: 1, inquiries: 0 },
          ],
        }}
        range="30d"
      />,
    );

    const rows = screen.getAllByRole("row").slice(1);
    expect(rows.map((row) => row.querySelector("td")?.textContent)).toEqual([
      "Story highlightvia foster-me",
      "Lawn sign",
      "Tracked link",
    ]);
    expect(screen.getByRole("link", { name: "See your full foster-me funnel" })).toHaveAttribute(
      "href",
      "/profile/links",
    );
  });

  it("skips the funnel link when no traffic came through foster-me links", () => {
    render(
      <AnalyticsView
        petName="Mochi"
        adopted={false}
        channels={[]}
        links={[
          {
            id: "pet",
            target: "pet",
            petId: "pet-1",
            code: "petcode",
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
          byLink: [{ linkId: "pet", channelKey: "lawn_sign", views: 2, inquiries: 0 }],
        }}
        range="30d"
      />,
    );
    expect(screen.queryByText("via foster-me")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "See your full foster-me funnel" }),
    ).not.toBeInTheDocument();
  });
});
