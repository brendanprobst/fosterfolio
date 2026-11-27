import type { User } from '@api/domain/entities/User';
import type { IUserRepository } from '@api/domain/repositories/IUserRepository';
import { isUuid, UserHandle } from '@api/domain/value-objects/UserHandle';

/**
 * Resolve a route param that may be a uuid or a vanity handle.
 * UUID → findById. Otherwise try findByHandle, then a former handle (alias),
 * then findById for non-uuid ids (e.g. the Playwright seed user).
 */
export async function resolveUser(
  userRepository: IUserRepository,
  idOrHandle: string
): Promise<User | null> {
  const raw = idOrHandle.trim().replace(/^@+/, '');
  if (!raw) return null;
  if (isUuid(raw)) {
    return userRepository.findById(raw);
  }
  const handle = UserHandle.normalize(raw);
  const byHandle = handle ? await userRepository.findByHandle(handle) : null;
  if (byHandle) return byHandle;
  const aliasOwnerId = handle ? await userRepository.findAliasOwner(handle) : null;
  if (aliasOwnerId) {
    const byAlias = await userRepository.findById(aliasOwnerId);
    if (byAlias) return byAlias;
  }
  // If we get here, the user is not found by handle, so we try to find them by id as a last ditch effort
  return userRepository.findById(raw);
}

/**
 * The handle clients should redirect to when `idOrHandle` was a former handle.
 * Undefined when the lookup used the current handle or an id, or the user has no handle now.
 */
export function canonicalHandleFor(idOrHandle: string, user: User): string | undefined {
  const raw = idOrHandle.trim().replace(/^@+/, '');
  if (!raw || isUuid(raw) || raw === user.id || !user.handle) return undefined;
  const handle = UserHandle.normalize(raw);
  return handle && handle !== user.handle ? user.handle : undefined;
}
