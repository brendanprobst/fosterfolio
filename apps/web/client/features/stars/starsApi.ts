import { publicApiRequest } from "@client/lib/publicApiRequest";
import { throwIfNotOk } from "@client/lib/readApiError";

export type StarResult = {
  starred: true;
  created: boolean;
  starCount: number;
};

export async function addStar(
  userId: string,
  sessionToken: string,
): Promise<StarResult> {
  const response = await publicApiRequest(
    `/users/${encodeURIComponent(userId)}/star`,
    {
      method: "POST",
      body: JSON.stringify({ sessionToken }),
    },
  );
  await throwIfNotOk(response, "Failed to star this profile.");
  return (await response.json()) as StarResult;
}
