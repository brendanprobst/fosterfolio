import type { User } from '@api/domain/entities/User';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
  countStars(userId: string): Promise<number>;
}
