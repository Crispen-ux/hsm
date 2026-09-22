export interface VehicleMatcher {
  label: string;
  pattern: RegExp;
}

export const VEHICLE_MAP: readonly VehicleMatcher[] = [
  { label: "Toyota Hilux", pattern: /\b(?:hilux|hi\s*lux|high\s*lux)\b/ },
  { label: "Ford Ranger", pattern: /\branger\b/ },
  { label: "Isuzu D-Max", pattern: /\b(?:d\s*max|dee\s*max)\b/ },
  { label: "Nissan Navara", pattern: /\bnavara\b/ },
  { label: "Volkswagen Amarok", pattern: /\bamarok\b/ },
  { label: "Toyota Land Cruiser", pattern: /\bland\s*cruiser\b/ },
  { label: "Toyota Fortuner", pattern: /\bfortuner\b/ },
];
