import { publicApiRequest } from "@client/lib/publicApiRequest";
import { throwIfNotOk } from "@client/lib/readApiError";
import type { CreateInquiryPayload, Inquiry } from "./types";

export async function createInquiry(payload: CreateInquiryPayload): Promise<Inquiry> {
  const response = await publicApiRequest("/inquiries", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  await throwIfNotOk(response, "Failed to send inquiry.");
  return (await response.json()) as Inquiry;
}

export async function reportInquirySource(
  inquiryId: string,
  token: string,
  selfReportedSource: string,
): Promise<void> {
  const response = await publicApiRequest(
    `/inquiries/${encodeURIComponent(inquiryId)}/self-reported-source`,
    {
      method: "PATCH",
      body: JSON.stringify({ token, selfReportedSource }),
    },
  );
  await throwIfNotOk(response, "Could not save how you heard about this pet.");
}
