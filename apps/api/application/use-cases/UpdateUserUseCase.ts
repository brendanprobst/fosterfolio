import type { SocialLink, UserOwnerDto } from '@api/domain/entities/User';
import { Result } from '@api/domain/errors/Result';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import type { IUserRepository } from '@api/domain/repositories/IUserRepository';
import type { GeoLookupAdapter } from '@api/infrastructure/adapters/geo/GeoLookupAdapter';

export type UpdateUserInput = {
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  zipCode?: string | null;
  socialLinks?: SocialLink[] | null;
  sheltersText?: string | null;
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
    if (actorId !== targetId) {
      return Result.failure(ErrorCatalog.USER_FORBIDDEN);
    }

    try {
      const user = await this.userRepository.findById(targetId);
      if (!user) {
        return Result.failure(ErrorCatalog.USER_NOT_FOUND);
      }

      const previousZip = user.zipCode;
      user.applyProfileUpdate(input);

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
      const starCount = await this.userRepository.countStars(targetId);
      return Result.success(user.toOwnerDto(starCount));
    } catch {
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}
