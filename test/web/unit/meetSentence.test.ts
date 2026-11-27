import { meetSentence } from "@client/pages/users/FosterMePreview";
import { describe, expect, it } from "vitest";

const base = {
  id: "p",
  name: "Frankie",
  ageValue: 5,
  ageUnit: "years",
  breed: "Lab Mix",
  species: "dog",
  sex: "male",
  primaryPhotoUrl: null,
};

describe("meetSentence", () => {
  it("formats he/she/they", () => {
    expect(meetSentence(base)).toBe("Meet Frankie, he is a 5 year old Lab Mix");
    expect(meetSentence({ ...base, name: "Mia", sex: "female" })).toBe(
      "Meet Mia, she is a 5 year old Lab Mix",
    );
    expect(meetSentence({ ...base, sex: null })).toBe("Meet Frankie, they are a 5 year old Lab Mix");
  });
  it("uses singular units and an/a", () => {
    expect(meetSentence({ ...base, ageValue: 1, ageUnit: "months" })).toBe(
      "Meet Frankie, he is a 1 month old Lab Mix",
    );
    expect(meetSentence({ ...base, ageValue: 8, breed: "Eskimo Dog" })).toBe(
      "Meet Frankie, he is an 8 year old Eskimo Dog",
    );
  });
  it("degrades on sparse data", () => {
    expect(meetSentence({ ...base, breed: null, species: null })).toBe(
      "Meet Frankie, he is a 5 year old pet",
    );
    expect(meetSentence({ ...base, ageValue: null })).toBe("Meet Frankie, he is a Lab Mix");
    expect(meetSentence({ ...base, ageValue: null, breed: null, species: null })).toBe(
      "Meet Frankie",
    );
  });
});
