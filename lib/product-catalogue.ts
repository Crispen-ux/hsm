import type { LineUnit } from "@/lib/domain";

export interface CatalogueProduct {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  unit: LineUnit;
  unitPriceCents: number;
  active: boolean;
}

export type ProductCategory =
  | "VEHICLE_COATING"
  | "CONTAINER_COATING"
  | "INDUSTRIAL_COATING"
  | "SURFACE_PREP"
  | "MOBILISATION"
  | "DELIVERY"
  | "ACCESSORIES"
  | "OTHER";

export const PRODUCT_CATEGORIES: readonly { key: ProductCategory; label: string }[] = [
  { key: "VEHICLE_COATING", label: "Vehicle Coating" },
  { key: "CONTAINER_COATING", label: "Container Coating" },
  { key: "INDUSTRIAL_COATING", label: "Industrial Coating" },
  { key: "SURFACE_PREP", label: "Surface Preparation" },
  { key: "MOBILISATION", label: "Mobilisation" },
  { key: "DELIVERY", label: "Delivery" },
  { key: "ACCESSORIES", label: "Accessories" },
  { key: "OTHER", label: "Other" },
];

export const CATEGORY_LABELS: Readonly<Record<ProductCategory, string>> = Object.fromEntries(
  PRODUCT_CATEGORIES.map((c) => [c.key, c.label]),
) as Record<ProductCategory, string>;

const STORAGE_KEY = "hawk-product-catalogue";

const DEFAULT_PRODUCTS: CatalogueProduct[] = [
  {
    id: "prod-001",
    name: "Full Vehicle Polyurea Coating",
    description: "Full vehicle polyurea coating",
    category: "VEHICLE_COATING",
    unit: "EACH",
    unitPriceCents: 5200_00,
    active: true,
  },
  {
    id: "prod-002",
    name: "Container Floor Coating",
    description: "Container floor only - polyurea coating",
    category: "CONTAINER_COATING",
    unit: "SQM",
    unitPriceCents: 0,
    active: true,
  },
  {
    id: "prod-003",
    name: "Container Full Interior",
    description: "Full interior polyurea coating",
    category: "CONTAINER_COATING",
    unit: "SQM",
    unitPriceCents: 0,
    active: true,
  },
  {
    id: "prod-004",
    name: "Container Exterior Only",
    description: "Exterior only polyurea coating",
    category: "CONTAINER_COATING",
    unit: "SQM",
    unitPriceCents: 0,
    active: true,
  },
  {
    id: "prod-005",
    name: "Container Full Shell",
    description: "Full shell polyurea coating (interior + exterior)",
    category: "CONTAINER_COATING",
    unit: "SQM",
    unitPriceCents: 0,
    active: true,
  },
  {
    id: "prod-006",
    name: "On-site Mobilisation",
    description: "On-site mobilisation fee",
    category: "MOBILISATION",
    unit: "EACH",
    unitPriceCents: 0,
    active: true,
  },
  {
    id: "prod-007",
    name: "Surface Preparation",
    description: "Surface preparation - sandblast/prime",
    category: "SURFACE_PREP",
    unit: "SQM",
    unitPriceCents: 0,
    active: true,
  },
  {
    id: "prod-008",
    name: "Delivery",
    description: "Delivery to site",
    category: "DELIVERY",
    unit: "EACH",
    unitPriceCents: 0,
    active: true,
  },
  {
    id: "prod-009",
    name: "Industrial Floor Coating",
    description: "Industrial floor polyurea coating",
    category: "INDUSTRIAL_COATING",
    unit: "SQM",
    unitPriceCents: 0,
    active: true,
  },
  {
    id: "prod-010",
    name: "Bakkie Bed Liner",
    description: "Bakkie load bed polyurea liner",
    category: "VEHICLE_COATING",
    unit: "EACH",
    unitPriceCents: 0,
    active: true,
  },
];

function readFromStorage(): CatalogueProduct[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CatalogueProduct[];
  } catch {
    return null;
  }
}

function writeToStorage(products: CatalogueProduct[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  } catch {
    // storage full or unavailable
  }
}

export function getCatalogueProducts(): CatalogueProduct[] {
  if (typeof window === "undefined") return DEFAULT_PRODUCTS;
  const stored = readFromStorage();
  if (stored) return stored;
  writeToStorage(DEFAULT_PRODUCTS);
  return DEFAULT_PRODUCTS;
}

export function getActiveProducts(): CatalogueProduct[] {
  return getCatalogueProducts().filter((p) => p.active);
}

export function getProductsByCategory(category: ProductCategory): CatalogueProduct[] {
  return getActiveProducts().filter((p) => p.category === category);
}

export function searchProducts(query: string): CatalogueProduct[] {
  const q = query.toLowerCase().trim();
  if (!q) return getActiveProducts();
  return getActiveProducts().filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q),
  );
}

export function addProduct(product: Omit<CatalogueProduct, "id">): CatalogueProduct {
  const products = getCatalogueProducts();
  const newProduct: CatalogueProduct = {
    ...product,
    id: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };
  const next = [...products, newProduct];
  writeToStorage(next);
  return newProduct;
}

export function updateProduct(id: string, patch: Partial<Omit<CatalogueProduct, "id">>): CatalogueProduct | null {
  const products = getCatalogueProducts();
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const updated = { ...products[idx], ...patch, id } as CatalogueProduct;
  const next = [...products.slice(0, idx), updated, ...products.slice(idx + 1)];
  writeToStorage(next);
  return updated;
}

export function deleteProduct(id: string): boolean {
  const products = getCatalogueProducts();
  const next = products.filter((p) => p.id !== id);
  if (next.length === products.length) return false;
  writeToStorage(next);
  return true;
}

export function formatCataloguePrice(cents: number): string {
  if (cents === 0) return "Price on request";
  return `R${(cents / 100).toFixed(2)}`;
}
