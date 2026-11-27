import { isHandleUniqueViolation } from '@api/application/isHandleUniqueViolation';
import { resolveUser } from '@api/application/resolveUser';
import type { SocialLink, UserOwnerDto } from '@api/domain/entities/User';
import { Result } from '@api/domain/errors/Result';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import type { IUserRepository } from '@api/domain/repositories/IUserRepository';
import { UserHandle } from '@api/domain/value-objects/UserHandle';
import type { GeoLookupAdapter } from '@api/infrastructure/adapters/geo/GeoLookupAdapter';
import { logUnexpectedError } from '@api/utils/logUnexpectedError';

export type UpdateUserInput = {
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  zipCode?: string | null;
  socialLinks?: SocialLink[] | null;
  sheltersText?: string | null;
  handle?: string | null;
};

const HANDLE_CHANGE_LIMIT = 2;
const HANDLE_CHANGE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export class UpdateUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly geoLookup: GeoLookupAdapter
  ) {}

  async execute(
    actorId: string,
    targetId: string,
    input: UpdateUserInput
  ): Promise<Result<UserOwnerDto>> {
    try {
      const user = await resolveUser(this.userRepository, targetId);
      if (!user) {
        return Result.failure(ErrorCatalog.USER_NOT_FOUND);
      }
      if (actorId !== user.id) {
        return Result.failure(ErrorCatalog.USER_FORBIDDEN);
      }

      const { handle: nextHandle, ...profileInput } = input;

      // Set when an existing handle is replaced or cleared; persisted with the save below.
      let formerHandle: string | null = null;
      const now = new Date();

      if (nextHandle !== undefined) {
        let next: string | null = null;
        if (nextHandle !== null && nextHandle.trim() !== '') {
          const parsed = UserHandle.parse(nextHandle);
          if (!parsed.ok) {
            return Result.failure(
              parsed.reason === 'blocklisted'
                ? ErrorCatalog.HANDLE_BLOCKLISTED
                : ErrorCatalog.HANDLE_INVALID
            );
          }
          next = parsed.handle.value;
        }

        const previous = user.handle;
        if (next !== previous) {
          // Setting a first handle is free; replacing or clearing one is rate limited.
          if (previous) {
            const since = new Date(now.getTime() - HANDLE_CHANGE_WINDOW_MS);
            const recent = await this.userRepository.countHandleChangesSince(user.id, since);
            if (recent >= HANDLE_CHANGE_LIMIT) {
              const oldest =
                (await this.userRepository.oldestHandleChangeSince(user.id, since)) ?? now;
              const nextChangeAt = new Date(oldest.getTime() + HANDLE_CHANGE_WINDOW_MS);
              return Result.failure(
                ErrorCatalog.HANDLE_CHANGE_LIMIT.withMetadata({
                  nextChangeAt: nextChangeAt.toISOString(),
                })
              );
            }
          }
          if (next) {
            const taken = await this.userRepository.isHandleTaken(next, user.id);
            if (taken) {
              return Result.failure(ErrorCatalog.HANDLE_TAKEN);
            }
            // Former handles are reserved for their original owner forever.
            const aliasOwnerId = await this.userRepository.findAliasOwner(next);
            if (aliasOwnerId && aliasOwnerId !== user.id) {
              return Result.failure(ErrorCatalog.HANDLE_TAKEN);
            }
          }
          formerHandle = previous;
          user.applyProfileUpdate({ handle: next });
        }
      }

      const previousZip = user.zipCode;
      user.applyProfileUpdate(profileInput);

      if (input.zipCode !== undefined) {
        const nextZip = input.zipCode?.trim() || null;
        if (!nextZip) {
          user.clearGeo();
        } else if (nextZip !== previousZip) {
          const geo = await this.geoLookup.lookupUsZip(nextZip);
          if (geo) {
            user.applyProfileUpdate({
              city: geo.city,
              state: geo.state,
              lat: geo.lat,
              lng: geo.lng,
            });
          } else {
            // Fail soft: keep the zip, drop stale geo rather than blocking save.
            user.clearGeo();
          }
        }
      }

      if (formerHandle) {
        await this.userRepository.recordAlias(formerHandle, user.id);
      }
      await this.userRepository.save(user);
      if (formerHandle) {
        try {
          await this.userRepository.recordHandleChange(user.id, now);
        } catch (error) {
          // The handle already changed. Losing one cooldown row must not fail the save.
          logUnexpectedError('UpdateUserUseCase.recordHandleChange', error);
        }
      }
      const starCount = await this.userRepository.countStars(user.id);
      return Result.success(user.toOwnerDto(starCount));
    } catch (error) {
      if (isHandleUniqueViolation(error)) {
        return Result.failure(ErrorCatalog.HANDLE_TAKEN);
      }
      logUnexpectedError('UpdateUserUseCase', error);
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}
