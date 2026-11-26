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

      if (nextHandle !== undefined) {
        if (nextHandle === null || nextHandle.trim() === '') {
          user.applyProfileUpdate({ handle: null });
        } else {
          const parsed = UserHandle.parse(nextHandle);
          if (!parsed.ok) {
            return Result.failure(
              parsed.reason === 'blocklisted'
                ? ErrorCatalog.HANDLE_BLOCKLISTED
                : ErrorCatalog.HANDLE_INVALID
            );
          }
          const taken = await this.userRepository.isHandleTaken(
            parsed.handle.value,
            user.id
          );
          if (taken) {
            return Result.failure(ErrorCatalog.HANDLE_TAKEN);
          }
          user.applyProfileUpdate({ handle: parsed.handle.value });
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

      await this.userRepository.save(user);
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
