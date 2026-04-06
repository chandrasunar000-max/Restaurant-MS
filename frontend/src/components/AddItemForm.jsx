import { useState } from "react";
import "../assets/css/AddItemForm.css";
import api from "../api/axios";

export default function AddItemForm({ onAdd, restaurantId }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  
  // Image states
  const [image, setImage] = useState("");
  const [imageFile, setImageFile] = useState(null);

  const [type, setType] = useState("none");
  const [spiceLevel, setSpiceLevel] = useState(0);
  const [serveTime, setServeTime] = useState(15);
  const [regular, setRegular] = useState("");
  const [medium, setMedium] = useState("");
  const [large, setLarge] = useState("");
  const [half, setHalf] = useState("");
  const [full, setFull] = useState("");
  const [customSizes, setCustomSizes] = useState([]); // [{ key: '', price: '' }]
  const [error, setError] = useState("");

  const reset = () => {
    setName("");
    setDescription("");
    setCategory("");
    setImage("");
    setImageFile(null); // Reset file
    setType("veg");
    setSpiceLevel(1);
    setServeTime(15);
    setRegular("");
    setMedium("");
    setLarge("");
    setHalf("");
    setFull("");
    setCustomSizes([]);
    setError("");
  };

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    // Build sizes object only with numeric values
    const sizes = {};
    const addIf = (key, val) => {
      if (val === "" || val == null) return;
      const n = Number(val);
      if (!Number.isNaN(n)) sizes[key] = n;
    };
    addIf("regular", regular);
    addIf("medium", medium);
    addIf("large", large);
    addIf("half", half);
    addIf("full", full);

    // Add custom size-price pairs
    for (const row of customSizes) {
      const key = (row?.key || "").trim();
      const val = row?.price;
      if (!key) continue;
      const n = Number(val);
      if (!Number.isNaN(n)) sizes[key] = n;
    }

    if (Object.keys(sizes).length === 0) {
      setError("Provide at least one size price (regular/medium/large/half/full).");
      return;
    }

    try {
      setLoading(true);

      // --- NEW IMAGE UPLOAD LOGIC ---
      let finalImageUrl = image?.trim();

      if (imageFile) {
        if (!restaurantId) {
            throw new Error("Restaurant ID is missing. Cannot upload image.");
        }
        const formData = new FormData();
        formData.append("image", imageFile);

        const uploadRes = await api.post(
          `/restaurants/${restaurantId}/menu/upload`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );

        finalImageUrl = uploadRes.data.imageUrl;
      }
      // ------------------------------

      const payload = {
        name: name.trim(),
        description: description.trim(),
        image: finalImageUrl || undefined, // Use the processed URL
        category: category.toUpperCase().trim() || undefined,
        type,
        spiceLevel: Number(spiceLevel),
        serveTime: Number.isFinite(Number(serveTime)) ? Number(serveTime) : undefined,
        sizes,
      };

      const res = await api.post("/menu", payload);
      // backend returns created item
      const created = res.data;
      if (onAdd) onAdd(created);
      reset();
    } catch (err) {
      console.error("Add item failed:", err);
      const msg = err?.response?.data?.message || err.message || "Failed to add item.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="add-item-form" onSubmit={handleSubmit} noValidate>
      <header className="form-header">
        <h3>Add Menu Item</h3>
        <p className="hint">Fill in the item details. At least one size price is required.</p>
      </header>

      {error && <div className="form-error" role="alert">{error}</div>}

      <div className="grid-2">
        <label className="field">
          <span className="label">Item Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Margherita Pizza" required />
        </label>

        <label className="field">
          <span className="label">Category</span>
          <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Main Course" />
        </label>

        <div className="field span-2">
          <span className="label">Menu Image</span>
          <div className="image-upload-section">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            />
            <input
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="Or paste image URL (optional)"
            />
          </div>
        </div>

        <label className="field">
          <span className="label">Short Description</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief summary of the dish" />
        </label>

        <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <label className="field">
            <span className="label">Type</span>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="none">None</option>
              <option value="veg">Veg</option>
              <option value="non-veg">Non-veg</option>
            </select>
          </label>

          <label className="field">
            <span className="label">Spice Level</span>
            <select value={spiceLevel} onChange={(e) => setSpiceLevel(Number(e.target.value))}>
              <option value={0}>0 (No Spice)</option>
              <option value={1}>1 (Mild)</option>
              <option value={2}>2 (Medium)</option>
              <option value={3}>3 (Hot)</option>
            </select>
          </label>
        </div>

        <label className="field">
          <span className="label">Serve Time (min)</span>
          <input value={serveTime} onChange={(e) => setServeTime(e.target.value)} inputMode="numeric" placeholder="e.g. 15" />
        </label>
      </div>

      <section className="sizes-section">
        <h4 className="sizes-title">Sizes & Prices</h4>
        <div className="sizes-grid">
          <label className="size-field">
            <span className="size-label">Regular</span>
            <input value={regular} onChange={(e) => setRegular(e.target.value)} inputMode="decimal" placeholder="0.00" />
          </label>
          <label className="size-field">
            <span className="size-label">Medium</span>
            <input value={medium} onChange={(e) => setMedium(e.target.value)} inputMode="decimal" placeholder="-" />
          </label>
          <label className="size-field">
            <span className="size-label">Large</span>
            <input value={large} onChange={(e) => setLarge(e.target.value)} inputMode="decimal" placeholder="-" />
          </label>
          <label className="size-field">
            <span className="size-label">Half</span>
            <input value={half} onChange={(e) => setHalf(e.target.value)} inputMode="decimal" placeholder="-" />
          </label>
          <label className="size-field">
            <span className="size-label">Full</span>
            <input value={full} onChange={(e) => setFull(e.target.value)} inputMode="decimal" placeholder="-" />
          </label>
        </div>

        <div className="custom-sizes-container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
            <span className="label">Custom Sizes</span>
            <button type="button" className="btn" onClick={() => setCustomSizes((prev) => [...prev, { key: '', price: '' }])}>+ Add Size</button>
          </div>
          {customSizes.map((row, idx) => (
            <div key={idx} className="custom-size-row">
              <input value={row.key} onChange={(e) => {
                const v = e.target.value;
                setCustomSizes((prev) => prev.map((r, i) => i === idx ? { ...r, key: v } : r));
              }} placeholder="Size name (e.g. Family)" />
              <input value={row.price} onChange={(e) => {
                const v = e.target.value;
                setCustomSizes((prev) => prev.map((r, i) => i === idx ? { ...r, price: v } : r));
              }} inputMode="decimal" placeholder="Price" />
              <button type="button" className="btn btn-danger" onClick={() => setCustomSizes((prev) => prev.filter((_, i) => i !== idx))}>×</button>
            </div>
          ))}
        </div>
      </section>

      <div className="form-actions">
        <button type="button" className="btn" onClick={reset}>Reset</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Processing..." : "Add to Menu"}
        </button>
      </div>
    </form>
  );
}
