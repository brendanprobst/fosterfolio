import { SignUploadUseCase } from '@api/application/use-cases/SignUploadUseCase';
import type { DataAdapter } from '@api/infrastructure/adapters/dataAdapter/DataAdapter';
import { InMemoryStorageAdapter } from '@api/infrastructure/adapters/storage/InMemoryStorageAdapter';
import type { StorageAdapter } from '@api/infrastructure/adapters/storage/StorageAdapter';
import { SupabaseStorageAdapter } from '@api/infrastructure/adapters/storage/SupabaseStorageAdapter';

export type StorageModule = {
  storageAdapter: StorageAdapter;
  getSignUploadUseCase: () => SignUploadUseCase;
};

export function createStorageModule(
  dataAdapter: DataAdapter | null
): StorageModule {
  let storageAdapter: StorageAdapter;

  if (dataAdapter) {
    const url = process.env.SUPABASE_URL?.trim();
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!url || !serviceRoleKey) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for storage signing'
      );
    }
    storageAdapter = new SupabaseStorageAdapter(dataAdapter, {
      url,
      serviceRoleKey,
    });
  } else {
    storageAdapter = new InMemoryStorageAdapter();
  }

  return {
    storageAdapter,
    getSignUploadUseCase: () => new SignUploadUseCase(storageAdapter),
  };
}
