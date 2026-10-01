"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@client/components/ui/card";
import { InquiryForm } from "./InquiryForm";

type LockedInquiryPreviewProps = {
  petName: string;
};

export function LockedInquiryPreview({ petName }: LockedInquiryPreviewProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Contact the foster</CardTitle>
        <CardDescription>
          Visitors use this form to email you. You can&apos;t send an inquiry to
          yourself.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <InquiryForm
          targetUserId="preview"
          heading="Contact the foster"
          showHeading={false}
          locked
          petName={petName}
        />
      </CardContent>
    </Card>
  );
}
