import type { IAllowedEmailRepository } from '@api/domain/repositories/IAllowedEmailRepository';
import type { DataAdapter } from '@api/infrastructure/adapters/dataAdapter/DataAdapter';
import { AllowedEmailRepository } from '@api/infrastructure/repositories/AllowedEmailRepository';

export type AllowlistModule = {
  isAllowlistConfigured: () => boolean;
  getAllowedEmailRepository: () => IAllowedEmailRepository;
};

export function createAllowlistModule(dataAdapter: DataAdapter | null): AllowlistModule {
  const allowedEmailRepository: IAllowedEmailRepository | null = dataAdapter
    ? new AllowedEmailRepository(dataAdapter)
    : null;

  return {
    isAllowlistConfigured: () => allowedEmailRepository !== null,
    getAllowedEmailRepository: () => {
      if (!allowedEmailRepository) {
        throw new Error(
          'Email allowlist requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. In-memory dev mode does not implement allowlist storage.',
        );
      }
      return allowedEmailRepository;
    },
  };
}
