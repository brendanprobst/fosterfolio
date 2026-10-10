export type ChannelOption = {
  key: string;
  name: string;
  isPreset: boolean;
};

export type TrackedLinkItem = {
  id: string;
  petId: string;
  code: string;
  channelKey: string;
  channelName: string;
  label: string | null;
  archivedAt: string | null;
  views: number;
  inquiries: number;
};

export type PetAnalytics = {
  funnel: {
    views: number;
    formOpens: number;
    inquiries: number;
    conversionRate: number | null;
  };
  byChannel: Array<{ channelKey: string; views: number; inquiries: number }>;
  byLink: Array<{ linkId: string; channelKey: string; views: number; inquiries: number }>;
  byCity: Array<{ city: string; views: number }>;
  viewsByDay: Array<{ day: string; views: number }>;
};

export type PetAnalyticsSummary = {
  views: number;
  inquiries: number;
  topChannel: { channelKey: string; views: number } | null;
};
