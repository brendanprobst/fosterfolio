"use client";

import { useMutation } from "@tanstack/react-query";
import { createInquiry } from "./inquiriesApi";
import type { CreateInquiryPayload } from "./types";

export function useCreateInquiryMutation() {
  return useMutation({
    mutationFn: (payload: CreateInquiryPayload) => createInquiry(payload),
  });
}
