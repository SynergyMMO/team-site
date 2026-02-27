import { useState } from "react";
import styles from "../Admin.module.css";
import ConfirmDialog from "./ConfirmDialog";

const CATEGORIES = ["Themes", "Encounter Counters", "Pokemon Textures", "Other"];

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}

const emptyTheme = { name: "", author: "", description: "", previewImage: "", previewImages: [], detailedImages: [], link: "" };

export default function ThemesTab({ themesDB, onSave, onDelete, isMutating }) {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [themeData, setThemeData] = useState(emptyTheme);
  const [editingKey, setEditingKey] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const currentItems = themesDB[activeCategory] || {};

  const handleCreateOrUpdate = async () => {
    if (!themeData.name) return;
    const itemKey = editingKey || slugify(themeData.name);
    await onSave(activeCategory, itemKey, themeData);
    setThemeData(emptyTheme);
    setEditingKey(null);
  };



  const handleEdit = (key, item) => {
    setEditingKey(key);
    setThemeData({
      ...emptyTheme,
      ...item,
      previewImages: item.previewImages || [],
      detailedImages: item.detailedImages || []
    });
  };

  // Detailed Images handlers
  const handleAddDetailedImage = () => {
    setThemeData((prev) => ({
      ...prev,
      detailedImages: [...(prev.detailedImages || []), ""]
    }));
  };

  const handleDetailedImageChange = (idx, value) => {
    setThemeData((prev) => {
      const arr = [...(prev.detailedImages || [])];
      arr[idx] = value;
      return { ...prev, detailedImages: arr };
    });
  };

  const handleRemoveDetailedImage = (idx) => {
    setThemeData((prev) => {
      const arr = [...(prev.detailedImages || [])];
      arr.splice(idx, 1);
      return { ...prev, detailedImages: arr };
    });
  };

  // Preview Images handlers
  const handleAddPreviewImage = () => {
    setThemeData((prev) => ({
      ...prev,
      previewImages: [...(prev.previewImages || []), ""]
    }));
  };

  const handlePreviewImageChange = (idx, value) => {
    setThemeData((prev) => {
      const arr = [...(prev.previewImages || [])];
      arr[idx] = value;
      return { ...prev, previewImages: arr };
    });
  };

  const handleRemovePreviewImage = (idx) => {
    setThemeData((prev) => {
      const arr = [...(prev.previewImages || [])];
      arr.splice(idx, 1);
      return { ...prev, previewImages: arr };
    });
  };

  const handleCancelEdit = () => {
    setEditingKey(null);
    setThemeData(emptyTheme);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    await onDelete(confirmDelete.category, confirmDelete.key, confirmDelete.name);
    setConfirmDelete(null);
  };

  return (
    <div>
      {/* Category selector */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={activeCategory === cat ? styles.tabActive : styles.tab}
            style={{ margin: 0 }}
            onClick={() => {
              setActiveCategory(cat);
              setEditingKey(null);
              setThemeData(emptyTheme);
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Form */}
      <h3>{editingKey ? "Edit Theme" : "Add Theme"} — {activeCategory}</h3>
      <div className={styles.editSection}>
        <label>Name:</label>
        <input
          type="text"
          className={styles.adminInput}
          value={themeData.name}
          onChange={(e) => setThemeData({ ...themeData, name: e.target.value })}
        />

        <label>Author:</label>
        <input
          type="text"
          className={styles.adminInput}
          value={themeData.author}
          onChange={(e) => setThemeData({ ...themeData, author: e.target.value })}
        />

        <label>Description:</label>
        <input
          type="text"
          className={styles.adminInput}
          value={themeData.description}
          onChange={(e) => setThemeData({ ...themeData, description: e.target.value })}
        />


        <label>Preview Image URL:</label>
        <input
          type="text"
          className={styles.adminInput}
          value={themeData.previewImage}
          onChange={(e) => setThemeData({ ...themeData, previewImage: e.target.value })}
        />

        <label>Detailed Images (multiple):</label>
        <div style={{ marginBottom: 8 }}>
          {(themeData.detailedImages || []).map((img, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <input
                type="text"
                className={styles.adminInput}
                style={{ flex: 1 }}
                value={img}
                placeholder={`Detailed Image URL #${idx + 1}`}
                onChange={e => handleDetailedImageChange(idx, e.target.value)}
              />
              <button type="button" className={styles.deleteBtn} onClick={() => handleRemoveDetailedImage(idx)}>
                Remove
              </button>
            </div>
          ))}
          <button type="button" className={styles.editBtn} onClick={handleAddDetailedImage}>
            Add Detailed Image
          </button>
        </div>

        <label>Download / Link URL:</label>
        <input
          type="text"
          className={styles.adminInput}
          value={themeData.link}
          onChange={(e) => setThemeData({ ...themeData, link: e.target.value })}
        />

        <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
          <button
            className={styles.editBtn}
            onClick={handleCreateOrUpdate}
            disabled={isMutating || !themeData.name}
          >
            {isMutating ? "Saving..." : editingKey ? "Save Changes" : "Add Theme"}
          </button>
          {editingKey && (
            <button className={styles.deleteBtn} onClick={handleCancelEdit}>
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Theme list */}
      <h3>Themes in "{activeCategory}"</h3>
      {Object.keys(currentItems).length === 0 ? (
        <p className={styles.hintText}>No themes in this category yet.</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.shinyTable}>
            <thead>
              <tr>
                <th>Preview</th>
                <th>Name</th>
                <th>Author</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(currentItems).map(([key, item]) => (
                <tr key={key}>
                  <td>
                    {item.previewImage ? (
                      <img
                        src={item.previewImage}
                        alt={item.name}
                        style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 4 }}
                      />
                    ) : (
                      <span style={{ color: "#666", fontSize: "0.8rem" }}>No image</span>
                    )}
                  </td>
                  <td>{item.name}</td>
                  <td>{item.author}</td>
                  <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.description}
                  </td>
                  <td className={styles.actionBtns}>
                    <button className={styles.editBtn} onClick={() => handleEdit(key, item)}>
                      Edit
                    </button>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => setConfirmDelete({ category: activeCategory, key, name: item.name })}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete Theme"
          message={`Are you sure you want to delete "${confirmDelete.name}" from ${confirmDelete.category}?`}
          confirmLabel="Delete"
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
