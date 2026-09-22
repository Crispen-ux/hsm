"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getCatalogueProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  formatCataloguePrice,
  PRODUCT_CATEGORIES,
  CATEGORY_LABELS,
  type CatalogueProduct,
  type ProductCategory,
} from "@/lib/product-catalogue";
import { Field } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import type { LineUnit } from "@/lib/domain";

export default function CataloguePage() {
  const [products, setProducts] = useState<CatalogueProduct[]>([]);
  const [editing, setEditing] = useState<CatalogueProduct | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    setProducts(getCatalogueProducts());
  }, []);

  const refresh = useCallback(() => {
    setProducts(getCatalogueProducts());
  }, []);

  const handleAdd = useCallback((data: Omit<CatalogueProduct, "id">) => {
    addProduct(data);
    refresh();
    setShowForm(false);
  }, [refresh]);

  const handleUpdate = useCallback((id: string, patch: Partial<CatalogueProduct>) => {
    updateProduct(id, patch);
    refresh();
    setEditing(null);
  }, [refresh]);

  const handleDelete = useCallback((id: string) => {
    if (confirm("Delete this product?")) {
      deleteProduct(id);
      refresh();
    }
  }, [refresh]);

  const handleToggleActive = useCallback((id: string, active: boolean) => {
    updateProduct(id, { active });
    refresh();
  }, [refresh]);

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="display-wide text-chrome text-[clamp(1.6rem,7vw,2.25rem)]">Product Catalogue</h1>
        <button
          type="button"
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="btn btn-primary chamfer"
        >
          Add product
        </button>
      </div>

      {(showForm || editing) && (
        <ProductForm
          initial={editing}
          onSubmit={editing ? (data) => handleUpdate(editing.id, data) : handleAdd}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      <div className="mt-6 space-y-2">
        {PRODUCT_CATEGORIES.map((cat) => {
          const items = products.filter((p) => p.category === cat.key);
          if (items.length === 0) return null;
          return (
            <div key={cat.key}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">{cat.label}</h2>
              <ul className="divide-y divide-hawk-obsidian-border border border-hawk-obsidian-border bg-hawk-obsidian-card">
                {items.map((product) => (
                  <li key={product.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate text-sm", product.active ? "text-zinc-100" : "text-zinc-500")}>
                        {product.name}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {product.unit === "SQM" ? "per m²" : "each"} · {formatCataloguePrice(product.unitPriceCents)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(product.id, !product.active)}
                        className={cn("min-h-[32px] px-2 text-xs border", product.active ? "border-emerald-500 text-emerald-400" : "border-zinc-600 text-zinc-500")}
                      >
                        {product.active ? "Active" : "Hidden"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditing(product); setShowForm(false); }}
                        className="min-h-[32px] px-2 text-xs text-zinc-400 underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(product.id)}
                        className="min-h-[32px] px-2 text-xs text-red-400 underline"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {products.length === 0 && (
          <p className="mt-6 text-zinc-400">No products in catalogue. Add your first product to get started.</p>
        )}
      </div>
    </section>
  );
}

function ProductForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: CatalogueProduct | null;
  onSubmit: (data: Omit<CatalogueProduct, "id">) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState<ProductCategory>(initial?.category ?? "VEHICLE_COATING");
  const [unit, setUnit] = useState<LineUnit>(initial?.unit ?? "EACH");
  const [unitPrice, setUnitPrice] = useState(initial ? String(initial.unitPriceCents / 100) : "");
  const [active, setActive] = useState(initial?.active ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(unitPrice) || 0;
    onSubmit({
      name: name.trim(),
      description: description.trim() || name.trim(),
      category,
      unit,
      unitPriceCents: Math.round(priceNum * 100),
      active,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4 border border-hawk-obsidian-border bg-hawk-obsidian-card p-4">
      <h2 className="text-lg font-semibold text-zinc-100">{initial ? "Edit product" : "New product"}</h2>
      <Field id="prod-name" label="Name">
        <input id="prod-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="field-input" required placeholder="Product name" />
      </Field>
      <Field id="prod-desc" label="Description" hint="optional">
        <input id="prod-desc" type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="field-input" placeholder="Short description for line items" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field id="prod-category" label="Category">
          <select id="prod-category" value={category} onChange={(e) => setCategory(e.target.value as ProductCategory)} className="field-input">
            {PRODUCT_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </Field>
        <Field id="prod-unit" label="Unit">
          <select id="prod-unit" value={unit} onChange={(e) => setUnit(e.target.value as LineUnit)} className="field-input">
            <option value="EACH">Each</option>
            <option value="SQM">Per m²</option>
          </select>
        </Field>
      </div>
      <Field id="prod-price" label="Price (R)" hint="0 = price on request">
        <input id="prod-price" type="text" inputMode="decimal" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className="field-input font-mono" placeholder="0.00" />
      </Field>
      <div className="flex items-center gap-3">
        <input id="prod-active" type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4" />
        <label htmlFor="prod-active" className="text-sm text-zinc-300">Active (visible in dropdowns)</label>
      </div>
      <div className="flex gap-3">
        <button type="submit" className="btn btn-primary chamfer">{initial ? "Save changes" : "Add product"}</button>
        <button type="button" onClick={onCancel} className="btn btn-secondary chamfer">Cancel</button>
      </div>
    </form>
  );
}
