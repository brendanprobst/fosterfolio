import { SegmentedToggle } from "./SegmentedToggle";

export const PET_AGE_UNITS = [
  { value: "years", label: "Year" },
  { value: "months", label: "Months" },
  { value: "weeks", label: "Weeks" },
] as const;

type AgeUnitToggleProps = {
  value: string;
  onChange: (value: string) => void;
};

export function AgeUnitToggle({ value, onChange }: AgeUnitToggleProps) {
  return (
    <SegmentedToggle
      label="Age unit"
      value={value}
      options={PET_AGE_UNITS.map((unit) => ({
        value: unit.value,
        label: unit.value === "years" ? "Years" : unit.label,
      }))}
      onChange={onChange}
    />
  );
}
