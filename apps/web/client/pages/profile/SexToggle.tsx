import { SegmentedToggle } from "./SegmentedToggle";

export const PET_SEX_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "unsure", label: "Unsure" },
] as const;

type SexToggleProps = {
  value: string;
  onChange: (value: string) => void;
};

export function SexToggle({ value, onChange }: SexToggleProps) {
  return (
    <SegmentedToggle
      label="Sex"
      value={value}
      options={PET_SEX_OPTIONS}
      onChange={onChange}
    />
  );
}
