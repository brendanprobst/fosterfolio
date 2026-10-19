export type {
  EmailTemplate,
  NewNotification,
  NotificationEntityRef,
  NotificationRecord,
  NotificationTypeRegistration,
  OutboundEmail,
  RenderedEmail,
} from "./types";
export type { EmailChannel, InAppChannel, NotificationPreferenceStore } from "./channels";
export {
  getNotificationType,
  listNotificationTypes,
  registerType,
  resetNotificationTypes,
} from "./registry";
export {
  dispatch,
  UnknownNotificationTypeError,
  type DispatchDependencies,
  type DispatchInput,
  type DispatchResult,
} from "./dispatch";
