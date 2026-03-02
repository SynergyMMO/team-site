import { useState } from "react";
import styles from "../Admin.module.css";

export default function BountiesTab({ bounties, onAdd, onEdit, onDelete, isMutating }) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [form, setForm] = useState({ month: "", pokemon: "", host: "", reward: "", description: "", perm: false, claimed: "" });

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const bountyData = { ...form };
    // If claimed is empty string, remove the property for consistency
    if (!bountyData.claimed) delete bountyData.claimed;
    if (editingIndex !== null) {
      onEdit(editingIndex, bountyData);
    } else {
      onAdd(bountyData);
    }
    setForm({ month: "", pokemon: "", host: "", reward: "", description: "", perm: false, claimed: "" });
    setEditingIndex(null);
  }

  function handleEdit(idx) {
    setEditingIndex(idx);
    setForm({
      month: bounties[idx].month || "",
      pokemon: bounties[idx].pokemon || "",
      host: bounties[idx].host || "",
      reward: bounties[idx].reward || "",
      description: bounties[idx].description || "",
      perm: !!bounties[idx].perm,
      claimed: bounties[idx].claimed || ""
    });
  }

  function handleDelete(idx) {
    if (window.confirm("Delete this bounty?")) {
      onDelete(idx);
    }
  }

  function handleCancel() {
    setEditingIndex(null);
    setForm({ month: "", pokemon: "", host: "", reward: "", description: "", perm: false, claimed: "" });
  }

  const [filter, setFilter] = useState({ month: '', perm: 'all' });

  // Filtered bounties for the main list (unclaimed)
  const filteredBounties = bounties.filter(b => {
    if (b.claimed) return false;
    if (filter.perm === 'perm' && !b.perm) return false;
    if (filter.perm === 'notperm' && b.perm) return false;
    if (filter.month && (b.month || '').toLowerCase() !== filter.month.toLowerCase()) return false;
    return true;
  });

  // Unique months for dropdown
  const monthOptions = Array.from(new Set(bounties.map(b => b.month).filter(Boolean)));

  return (
    <div>
      <h3>{editingIndex !== null ? "Edit Bounty" : "Add Bounty"}</h3>
      <form className={styles.editSection} onSubmit={handleSubmit}>
        <label>Month (leave blank if perm):</label>
        <input name="month" value={form.month} onChange={handleChange} className={styles.adminInput} />
        <label>Pokemon:</label>
        <input name="pokemon" value={form.pokemon} onChange={handleChange} className={styles.adminInput} required />
        <label>Host:</label>
        <input name="host" value={form.host} onChange={handleChange} className={styles.adminInput} required />
        <label>Reward:</label>
        <input name="reward" value={form.reward} onChange={handleChange} className={styles.adminInput} required />
        <label>Description:</label>
        <textarea name="description" value={form.description} onChange={handleChange} className={styles.adminInput} rows={2} />
        <label>
          <input type="checkbox" name="perm" checked={form.perm} onChange={handleChange} /> Permanent (perm)
        </label>
        <label>
          Claimed by:
          <input name="claimed" value={form.claimed} onChange={handleChange} className={styles.adminInput} placeholder="(leave blank if unclaimed)" />
        </label>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button className={styles.editBtn} type="submit" disabled={isMutating}>
            {isMutating ? "Saving..." : editingIndex !== null ? "Save Changes" : "Add Bounty"}
          </button>
          {editingIndex !== null && (
            <button className={styles.deleteBtn} type="button" onClick={handleCancel}>
              Cancel
            </button>
          )}
        </div>
      </form>
      <h3>Bounties List</h3>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 12 }}>
        <label>
          Filter by Month:
          <select value={filter.month} onChange={e => setFilter(f => ({ ...f, month: e.target.value }))} className={styles.adminInput} style={{ minWidth: 100, marginLeft: 4 }}>
            <option value="">All</option>
            {monthOptions.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>
        <label>
          <input
            type="radio"
            name="permfilter"
            checked={filter.perm === 'all'}
            onChange={() => setFilter(f => ({ ...f, perm: 'all' }))}
          /> All
        </label>
        <label>
          <input
            type="radio"
            name="permfilter"
            checked={filter.perm === 'perm'}
            onChange={() => setFilter(f => ({ ...f, perm: 'perm' }))}
          /> Perm only
        </label>
        <label>
          <input
            type="radio"
            name="permfilter"
            checked={filter.perm === 'notperm'}
            onChange={() => setFilter(f => ({ ...f, perm: 'notperm' }))}
          /> Not perm
        </label>
      </div>
      {filteredBounties.length === 0 ? (
        <p className={styles.hintText}>No unclaimed bounties.</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.shinyTable}>
            <thead>
              <tr>
                <th>Month</th>
                <th>Pokemon</th>
                <th>Host</th>
                <th>Reward</th>
                <th>Description</th>
                <th>Perm</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBounties.map((b, idx) => (
                <tr key={idx}>
                  <td>{b.month}</td>
                  <td>{b.pokemon}</td>
                  <td>{b.host}</td>
                  <td>{b.reward}</td>
                  <td>{b.description}</td>
                  <td>{b.perm ? "✔️" : ""}</td>
                  <td className={styles.actionBtns}>
                    <button className={styles.editBtn} onClick={() => handleEdit(idx)}>
                      Edit
                    </button>
                    <button className={styles.deleteBtn} onClick={() => handleDelete(idx)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <h3>Claimed</h3>
      <div className={styles.tableWrapper}>
        <table className={styles.shinyTable}>
          <thead>
            <tr>
              <th>Month</th>
              <th>Pokemon</th>
              <th>Host</th>
              <th>Reward</th>
              <th>Description</th>
              <th>Perm</th>
              <th>Claimed By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bounties.filter(b => b.claimed).length === 0 ? (
              <tr><td colSpan={8} className={styles.hintText}>No claimed bounties.</td></tr>
            ) : (
              bounties.filter(b => b.claimed).map((b, idx) => {
                // Find the actual index in the bounties array for correct edit/delete
                const realIdx = bounties.findIndex(x => x === b);
                return (
                  <tr key={"claimed-" + idx}>
                    <td>{b.month}</td>
                    <td>{b.pokemon}</td>
                    <td>{b.host}</td>
                    <td>{b.reward}</td>
                    <td>{b.description}</td>
                    <td>{b.perm ? "✔️" : ""}</td>
                    <td>{b.claimed}</td>
                    <td className={styles.actionBtns}>
                      <button className={styles.editBtn} onClick={() => handleEdit(realIdx)}>
                        Edit
                      </button>
                      <button className={styles.deleteBtn} onClick={() => handleDelete(realIdx)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
