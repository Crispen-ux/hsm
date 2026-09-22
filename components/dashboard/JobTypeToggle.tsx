import type { JobType } from "@/lib/domain";

const OPTIONS: ReadonlyArray<{ value: JobType; label: string }> = [
  { value: "VEHICLE", label: "Vehicle" },
  { value: "CONTAINER", label: "Container" },
  { value: "INDUSTRIAL", label: "Industrial" },
];

export function JobTypeToggle({ value, onChange }: { value: JobType; onChange: (next: JobType) => void }) {
  return (
    <fieldset>
      <legend className="sr-only">Job type</legend>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((option) => (
          <label key={option.value} className="choice-plate">
            <input type="radio" name="jobType" value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} />
            <span className="chamfer">{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
