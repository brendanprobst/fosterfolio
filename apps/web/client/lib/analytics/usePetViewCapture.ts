"use client";

import { useEffect, useRef } from "react";
import { capturePetEvent } from "./initFosterfolioAnalytics";

/** One pet_viewed per pet id while this page is mounted. */
export function usePetViewCapture(
  pet: { id: string; ownerId: string } | null | undefined,
  capture: boolean,
): void {
  const seen = useRef<string | null>(null);

  useEffect(() => {
    if (!pet || !capture || seen.current === pet.id) return;
    seen.current = pet.id;
    void capturePetEvent("pet_viewed", { id: pet.id, ownerId: pet.ownerId });
  }, [pet, capture]);
}
