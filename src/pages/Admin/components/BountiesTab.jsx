import { useState } from "react";
import styles from "../Admin.module.css";

export default function BountiesTab({ bounties, onAdd, onEdit, onDelete, isMutating }) {
  const [editingBounty, setEditingBounty] = useState(null);
  const [form, setForm] = useState({ title: "", month: "", pokemon: "", host: "", reward: "", description: "", perm: false, claimed: "" });

  // Handle input changes
  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  // Submit add/edit form
  function handleSubmit(e) {
    e.preventDefault();
    const bountyData = { ...form };

    if (!bountyData.claimed) delete bountyData.claimed;

    // Preserve ID if editing
    if (editingBounty?.id) bountyData.id = editingBounty.id;

    // Assign new ID if needed
    if (!bountyData.id) {
      let prefix = bountyData.perm ? "perm" : (bountyData.month || "month").toLowerCase();
      const usedNums = Object.values(bounties)
        .flat()
        .filter(b => b.id?.startsWith(prefix))
        .map(b => Number(b.id.replace(prefix, "")))
        .filter(n => !isNaN(n));
      let idNum = 1;
      while (usedNums.includes(idNum)) idNum++;
      bountyData.id = `${prefix}${idNum}`;
    }

    if (editingBounty) {
      onEdit(bountyData);
    } else {
      onAdd(bountyData);
    }

    setForm({ month: "", pokemon: "", host: "", reward: "", description: "", perm: false, claimed: "" });
    setEditingBounty(null);
  }

  // Start editing a bounty
  function handleEdit(bounty) {
    setEditingBounty(bounty);
    setForm({
      title: bounty.title || "",
      month: bounty.month || "",
      pokemon: bounty.pokemon || "",
      host: bounty.host || "",
      reward: bounty.reward || "",
      description: bounty.description || "",
      perm: !!bounty.perm,
      claimed: bounty.claimed || ""
    });
  }

  // Delete a bounty by ID
  async function handleDelete(bountyId) {
    if (window.confirm("Delete this bounty?")) {
      try {
        const result = await onDelete(bountyId);
      } catch (err) {
      }
    }
  }

  function handleCancel() {
    setEditingBounty(null);
    setForm({ title: "", month: "", pokemon: "", host: "", reward: "", description: "", perm: false, claimed: "" });
  }

  // Filter unclaimed and claimed bounties
  const filteredBounties = Object.fromEntries(
    Object.entries(bounties).map(([category, list]) => [
      category,
      list.filter(b => !b.claimed)
    ])
  );

  const claimedBounties = Object.fromEntries(
    Object.entries(bounties).map(([category, list]) => [
      category,
      list.filter(b => b.claimed)
    ])
  );

  // Get all months for dropdown
  const monthOptions = Array.from(new Set((bounties.March || []).map(b => b.month).filter(Boolean)));

  // Render table rows
  function renderTable(category, showClaimed = false) {
    const list = (showClaimed ? claimedBounties[category] : filteredBounties[category]) || [];
    if (!list.length) return <tr><td colSpan={showClaimed ? 10 : 9} className={styles.hintText}>{showClaimed ? `No claimed ${category} bounties.` : `No unclaimed ${category} bounties.`}</td></tr>;

    return list.map(b => (
      <tr key={b.id}>
        <td>{b.id}</td>
        <td>{b.title}</td>
        <td>{b.month}</td>
        <td>{b.pokemon}</td>
        <td>{b.host}</td>
        <td>{b.reward}</td>
        <td>{b.description}</td>
        <td>{b.perm ? "\u2714\ufe0f" : ""}</td>
        {showClaimed && <td>{b.claimed}</td>}
        <td className={styles.actionBtns}>
          <button className={styles.editBtn} onClick={() => handleEdit(b)}>Edit</button>
          <button className={styles.deleteBtn} onClick={() => handleDelete(b.id)}>Delete</button>
        </td>
      </tr>
    ));
  }

  return (
    <div>
      <h3>{editingBounty ? "Edit Bounty" : "Add Bounty"}</h3>
      <form className={styles.editSection} onSubmit={handleSubmit}>
        <label>Title:</label>
        <input name="title" value={form.title} onChange={handleChange} className={styles.adminInput} required />
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
            {isMutating ? "Saving..." : editingBounty ? "Save Changes" : "Add Bounty"}
          </button>
          {editingBounty && (
            <button className={styles.deleteBtn} type="button" onClick={handleCancel}>Cancel</button>
          )}
        </div>
      </form>

      <h3>Bounties List</h3>

      <h4>March Bounties</h4>
      <div className={styles.tableWrapper}>
        <table className={styles.shinyTable}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Month</th>
              <th>Pokemon</th>
              <th>Host</th>
              <th>Reward</th>
              <th>Description</th>
              <th>Perm</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>{renderTable("March")}</tbody>
        </table>
      </div>

      <h4>Permanent Bounties</h4>
      <div className={styles.tableWrapper}>
        <table className={styles.shinyTable}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Month</th>
              <th>Pokemon</th>
              <th>Host</th>
              <th>Reward</th>
              <th>Description</th>
              <th>Perm</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>{renderTable("Perm")}</tbody>
        </table>
      </div>

      {/* Claimed Bounties Section: Only show if any claimed bounties exist */}
      {(claimedBounties["March"]?.length > 0 || claimedBounties["Perm"]?.length > 0) && (
        <>
          <h4>Claimed Bounties</h4>
          {claimedBounties["March"]?.length > 0 && (
            <div className={styles.tableWrapper}>
              <table className={styles.shinyTable}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
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
                <tbody>{renderTable("March", true)}</tbody>
              </table>
            </div>
          )}
          {claimedBounties["Perm"]?.length > 0 && (
            <div className={styles.tableWrapper}>
              <table className={styles.shinyTable}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
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
                <tbody>{renderTable("Perm", true)}</tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
