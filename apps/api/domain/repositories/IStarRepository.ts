export type AddStarResult = {
  created: boolean;
  starCount: number;
};

export interface IStarRepository {
  addStar(input: {
    starredUserId: string;
    sessionToken: string;
    starrerUserId?: string | null;
  }): Promise<AddStarResult>;
  countStars(starredUserId: string): Promise<number>;
}
