"use client";

import { useEffect, useRef } from "react";
import { captureFosterMeViewed, capturePetEvent, consumeViaFosterMe } from "./initFosterfolioAnalytics";

/** One pet_viewed per pet id while this page is mounted. */
export function usePetViewCapture(
  pet: { id: string; ownerId: string } | null | undefined,
  capture: boolean,
): void {
  const seen = useRef<string | null>(null);

  useEffect(() => {
    if (!pet) return;
    consumeViaFosterMe(pet.id);
  }, [pet]);

  useEffect(() => {
    if (!pet || !capture || seen.current === pet.id) return;
    seen.current = pet.id;
    void capturePetEvent("pet_viewed", { id: pet.id, ownerId: pet.ownerId });
  }, [pet, capture]);
}

/** One foster_me_viewed per owner while this preview is mounted. */
export function useFosterMeViewCapture(input: {
  ownerId: string | null | undefined;
  petCount: number;
  capture: boolean;
}): void {
  const seen = useRef<string | null>(null);
  const { ownerId, petCount, capture } = input;

  useEffect(() => {
    if (!capture || !ownerId || petCount <= 0 || seen.current === ownerId) return;
    seen.current = ownerId;
    void captureFosterMeViewed({ ownerId, petCount });
  }, [capture, ownerId, petCount]);
}
