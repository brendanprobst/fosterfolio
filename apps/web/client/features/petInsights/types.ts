export type ChannelOption = {
  key: string;
  name: string;
  isPreset: boolean;
};

export type TrackedLinkTarget = "pet" | "foster_me";

export type TrackedLinkItem = {
  id: string;
  /** The API always sends it; optional so pre-5b fixtures stay valid. Missing means "pet". */
  target?: TrackedLinkTarget;
  /** Null for foster-me links. */
  petId: string | null;
  /** `GET /me/links` only, for pet-target links. */
  petName?: string | null;
  createdAt?: string;
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
  inquiriesByDay: Array<{ day: string; inquiries: number }>;
};

/** `GET /me/links/analytics`. A null `linkId` is untagged foster-me traffic. */
export type OwnerLinkAnalytics = {
  funnel: {
    previewViews: number;
    petTaps: number;
    inquiries: number;
  };
  byLink: Array<{
    linkId: string | null;
    previewViews: number;
    petTaps: number;
    inquiries: number;
  }>;
  previewViewsByDay: Array<{ day: string; previewViews: number }>;
  inquiriesByDay: Array<{ day: string; inquiries: number }>;
};
