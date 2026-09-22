"use client";

import { useMemo, useState } from "react";
import { Field } from "@/components/ui/Field";
import {
  getActiveProducts,
  searchProducts,
  formatCataloguePrice,
  type CatalogueProduct,
  type ProductCategory,
} from "@/lib/product-catalogue";
import { CATEGORY_LABELS } from "@/lib/product-catalogue";
import type { LineUnit } from "@/lib/domain";

interface ProductSelectProps {
  id: string;
  label?: string;
  hint?: string;
  category?: ProductCategory;
  onSelect: (product: CatalogueProduct) => void;
  placeholder?: string;
}

export function ProductSelect({ id, label = "Select product", hint, category, onSelect, placeholder = "Search products..." }: ProductSelectProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const products = useMemo(() => {
    const all = category
      ? getActiveProducts().filter((p) => p.category === category)
      : getActiveProducts();
    if (!query.trim()) return all;
    return searchProducts(query).filter((p) => (category ? p.category === category : true));
  }, [query, category]);

  const grouped = useMemo(() => {
    const groups: Record<string, CatalogueProduct[]> = {};
    for (const p of products) {
      const cat = CATEGORY_LABELS[p.category] || p.category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    }
    return groups;
  }, [products]);

  const handleSelect = (product: CatalogueProduct) => {
    onSelect(product);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="relative">
      <Field id={id} label={label} hint={hint}>
        <input
          id={id}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="field-input"
          autoComplete="off"
        />
      </Field>
      {open && products.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto border border-zinc-700 bg-hawk-obsidian-card shadow-lg">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <div className="sticky top-0 bg-zinc-800 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                {cat}
              </div>
              {items.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handleSelect(product)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-zinc-700/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-zinc-100">{product.name}</p>
                    <p className="truncate text-xs text-zinc-400">
                      {product.unit === "SQM" ? "per m²" : "each"} · {formatCataloguePrice(product.unitPriceCents)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
      {open && query && products.length === 0 && (
        <div className="absolute z-50 mt-1 w-full border border-zinc-700 bg-hawk-obsidian-card px-3 py-2 text-sm text-zinc-400">
          No products found
        </div>
      )}
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
          tabIndex={-1}
          aria-label="Close"
        />
      )}
    </div>
  );
}
