import { SupabaseAdapter } from '@api/infrastructure/adapters/supabase/SupabaseAdapter';
import { createAllowlistModule } from '@api/infrastructure/composition/allowlist';
import { createThingsModule } from '@api/infrastructure/composition/things';
import { Logger } from '@api/utils/logger';

function hasSupabaseEnv(): boolean {
  return (
    !!process.env.SUPABASE_URL?.trim() &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

/**
 * Service Container - composition root.
 *
 * Domain wiring lives in `infrastructure/composition/*`. Add a new module there
 * and delegate getters from this class — do not grow ad-hoc fields here.
 */
export class Container {
  private readonly things: ReturnType<typeof createThingsModule>;
  private readonly allowlist: ReturnType<typeof createAllowlistModule>;

  constructor() {
    let dataAdapter: SupabaseAdapter | null = null;

    if (hasSupabaseEnv()) {
      dataAdapter = new SupabaseAdapter();
    } else if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required when NODE_ENV=production',
      );
    } else {
      Logger.warning(
        'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — using in-memory Thing storage (dev only). Data is lost on restart. Email allowlist requires Supabase. Copy apps/api/.env.example to apps/api/.env for Supabase.',
      );
    }

    this.things = createThingsModule(dataAdapter);
    this.allowlist = createAllowlistModule(dataAdapter);
  }

  isAllowlistConfigured(): boolean {
    return this.allowlist.isAllowlistConfigured();
  }

  getThingRepository() {
    return this.things.thingRepository;
  }

  getAllowedEmailRepository() {
    return this.allowlist.getAllowedEmailRepository();
  }

  getCreateThingUseCase() {
    return this.things.getCreateThingUseCase();
  }

  getGetThingByIdUseCase() {
    return this.things.getGetThingByIdUseCase();
  }

  getListThingsUseCase() {
    return this.things.getListThingsUseCase();
  }

  getUpdateThingUseCase() {
    return this.things.getUpdateThingUseCase();
  }

  getDeleteThingUseCase() {
    return this.things.getDeleteThingUseCase();
  }
}
