export type SignedUpload = {
  uploadUrl: string;
  path: string;
  token: string;
};

export interface StorageAdapter {
  getUserStorageBytes(userId: string): Promise<number>;
  createSignedUpload(path: string): Promise<SignedUpload>;
  getPublicUrl(path: string): string;
}
