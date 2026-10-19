import { useAuth } from "@client/auth";
import { fetchChannels, fetchPetAnalytics } from "@client/features/petInsights/petInsightsApi";
import type { PetAnalytics } from "@client/features/petInsights/types";
import { OwnerAnalyticsWidget } from "@client/pages/pets/OwnerAnalyticsWidget";
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authSignedIn, renderWithQueryClient } from "./support/renderWithProviders";

vi.mock("@client/auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@client/features/petInsights/petInsightsApi", () => ({
  fetchPetAnalytics: vi.fn(),
  fetchChannels: vi.fn(),
}));

function utcDay(offset: number): string {
  const end = new Date();
  const day = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  day.setUTCDate(day.getUTCDate() + offset);
  return day.toISOString().slice(0, 10);
}

function analytics(partial: Partial<PetAnalytics> = {}): PetAnalytics {
  return {
    funnel: { views: 0, formOpens: 0, inquiries: 0, conversionRate: null },
    byChannel: [],
    byLink: [],
    byCity: [],
    viewsByDay: [],
    inquiriesByDay: [],
    ...partial,
  };
}

function renderWidget(adopted = false) {
  return renderWithQueryClient(
    <OwnerAnalyticsWidget petId="pet-1" petName="Mochi" ownerRef="alex" adopted={adopted} />,
  );
}

describe("OwnerAnalyticsWidget tiles", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(authSignedIn());
    vi.mocked(fetchChannels).mockResolvedValue([
      { key: "instagram", name: "Instagram", isPreset: true },
    ]);
  });

  it("shows totals and an increase versus last week", async () => {
    vi.mocked(fetchPetAnalytics).mockImplementation(async (_token, _petId, range) => {
      if (range === "7d") {
        return analytics({
          funnel: { views: 70, formOpens: 0, inquiries: 7, conversionRate: 0.1 },
          byChannel: [{ channelKey: "instagram", views: 70, inquiries: 7 }],
        });
      }
      return analytics({
        funnel: { views: 84, formOpens: 0, inquiries: 7, conversionRate: 7 / 84 },
        viewsByDay: [
          ...Array.from({ length: 7 }, (_, index) => ({
            day: utcDay(-13 + index),
            views: 2,
          })),
          ...Array.from({ length: 7 }, (_, index) => ({
            day: utcDay(-6 + index),
            views: 10,
          })),
        ],
        inquiriesByDay: [{ day: utcDay(0), inquiries: 7 }],
      });
    });

    renderWidget();

    expect(await screen.findByText("70")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("↑ 400% vs last week")).toBeInTheDocument();
    expect(screen.getByText("New this week")).toBeInTheDocument();
    expect(screen.getByText("Instagram")).toBeInTheDocument();
    expect(screen.getByText("100% of views")).toBeInTheDocument();
  });

  it("shows an empty state and no tiles when the last 30 days are quiet", async () => {
    vi.mocked(fetchPetAnalytics).mockResolvedValue(analytics());

    renderWidget();

    expect(
      await screen.findByText(/No visits yet\. Share Mochi's link to start seeing views here/),
    ).toBeInTheDocument();
    expect(screen.queryByText("Top channel")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Links & analytics" })).toHaveAttribute(
      "href",
      "/profile/links",
    );
  });

  it("keeps the adopted banner and hides week-over-week copy", async () => {
    vi.mocked(fetchPetAnalytics).mockImplementation(async (_token, _petId, range) => {
      if (range === "7d") {
        return analytics({
          funnel: { views: 10, formOpens: 0, inquiries: 1, conversionRate: 0.1 },
          byChannel: [{ channelKey: "instagram", views: 10, inquiries: 1 }],
        });
      }
      return analytics({
        funnel: { views: 10, formOpens: 0, inquiries: 1, conversionRate: 0.1 },
        viewsByDay: [{ day: utcDay(0), views: 10 }],
        inquiriesByDay: [{ day: utcDay(0), inquiries: 1 }],
      });
    });

    renderWidget(true);

    expect(await screen.findByText("10")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Final results — Mochi was adopted 🎉");
    expect(screen.queryByText(/vs last week/)).not.toBeInTheDocument();
    expect(screen.queryByText("New this week")).not.toBeInTheDocument();
  });
});
