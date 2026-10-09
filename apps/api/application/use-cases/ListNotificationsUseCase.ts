import type { IInquiryRepository } from '@api/domain/repositories/IInquiryRepository';
import type { INotificationRepository } from '@api/domain/repositories/INotificationRepository';
import type { IPetRepository } from '@api/domain/repositories/IPetRepository';
import type { ITrackedLinkRepository } from '@api/domain/repositories/ITrackedLinkRepository';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import { Result } from '@api/domain/errors/Result';
import {
  decodeNotificationCursor,
  encodeNotificationCursor,
  parseNotificationLimit,
  parseNotificationStatus,
} from '@api/application/notifications/notificationQuery';
import type { NotificationRecord } from '@lattice/notifications';

export type InboxPetDto = {
  id: string;
  name: string | null;
  unavailable: boolean;
};

export type InboxNotificationDto = {
  id: string;
  type: string;
  readAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  payload: Record<string, unknown>;
  pet: InboxPetDto | null;
};

export type InboxPageDto = {
  items: InboxNotificationDto[];
  nextCursor: string | null;
};

function textOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export class ListNotificationsUseCase {
  constructor(
    private readonly notificationRepository: INotificationRepository,
    private readonly inquiryRepository: IInquiryRepository,
    private readonly petRepository: IPetRepository,
    private readonly trackedLinkRepository: ITrackedLinkRepository
  ) {}

  async execute(
    recipientId: string,
    statusRaw: string | undefined,
    limitRaw: string | undefined,
    cursorRaw: string | undefined
  ): Promise<Result<InboxPageDto>> {
    const status = parseNotificationStatus(statusRaw);
    if (!status) return Result.failure(ErrorCatalog.NOTIFICATION_INVALID_STATUS);
    if (cursorRaw && !decodeNotificationCursor(cursorRaw)) {
      return Result.failure(ErrorCatalog.NOTIFICATION_INVALID_INPUT);
    }
    try {
      const page = await this.notificationRepository.listForRecipient(
        recipientId,
        status,
        parseNotificationLimit(limitRaw),
        decodeNotificationCursor(cursorRaw)
      );
      const items = await Promise.all(page.items.map((row) => this.toDto(recipientId, row)));
      return Result.success({
        items,
        nextCursor: page.nextCursor ? encodeNotificationCursor(page.nextCursor) : null,
      });
    } catch {
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }

  private async toDto(recipientId: string, row: NotificationRecord): Promise<InboxNotificationDto> {
    const payload: Record<string, unknown> = { ...row.payload };
    if (row.entityType === 'inquiry' && row.entityId) {
      const inquiry = await this.inquiryRepository.findById(row.entityId);
      if (inquiry && inquiry.targetUserId === recipientId) {
        payload.senderName = inquiry.senderName;
        payload.senderEmail = inquiry.senderEmail;
        payload.zip = inquiry.zipCode;
        payload.message = inquiry.message;
        payload.petId = inquiry.targetPetId;
        payload.sourceChannelKey = inquiry.sourceChannelKey;
        payload.selfReportedSource = inquiry.selfReportedSource;
        if (inquiry.sourceLinkId) {
          const link = await this.trackedLinkRepository.findById(inquiry.sourceLinkId);
          if (link) payload.linkLabel = link.label;
        }
      }
    }

    const petId = textOrNull(payload.petId);
    let pet: InboxPetDto | null = null;
    if (petId) {
      const found = await this.petRepository.findById(petId);
      if (!found || found.deletedAt || found.ownerId !== recipientId) {
        pet = { id: petId, name: null, unavailable: true };
      } else {
        pet = { id: found.id, name: found.toListDto().name, unavailable: false };
      }
    }

    return {
      id: row.id,
      type: row.type,
      readAt: row.readAt,
      archivedAt: row.archivedAt,
      createdAt: row.createdAt,
      payload,
      pet,
    };
  }
}
