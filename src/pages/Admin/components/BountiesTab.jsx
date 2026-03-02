import { useState } from "react";
import styles from "../Admin.module.css";

export default function BountiesTab({ bounties, onAdd, onEdit, onDelete, isMutating }) {
  const [editingBounty, setEditingBounty] = useState(null);
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const [form, setForm] = useState({ title: "", month: currentMonth, pokemon: "", host: "", reward: "", description: "", perm: false, claimed: "" });
  const [bountyFilter, setBountyFilter] = useState("March");

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
      let prefix = bountyData.perm ? "perm" : (bountyData.month ? bountyData.month.toLowerCase() : "month");
      // Find the highest number for this prefix
      const usedNums = Object.values(bounties)
        .flat()
        .filter(b => b.id?.startsWith(prefix))
        .map(b => {
          const match = b.id.match(new RegExp(`^${prefix}(\\d+)$`, 'i'));
          return match ? Number(match[1]) : 0;
        })
        .filter(n => !isNaN(n) && n > 0);
      let idNum = usedNums.length > 0 ? Math.max(...usedNums) + 1 : 1;
      bountyData.id = `${prefix}${idNum}`;
    }

    if (editingBounty) {
      onEdit(bountyData);
    } else {
      onAdd(bountyData);
    }

    setForm({ title: "", month: currentMonth, pokemon: "", host: "", reward: "", description: "", perm: false, claimed: "" });
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
    setForm({ title: "", month: currentMonth, pokemon: "", host: "", reward: "", description: "", perm: false, claimed: "" });
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
    const isPerm = category === "Perm";
    if (!list.length) return <tr><td colSpan={showClaimed ? (isPerm ? 9 : 10) : (isPerm ? 8 : 9)} className={styles.hintText}>{showClaimed ? `No claimed ${category} bounties.` : `No unclaimed ${category} bounties.`}</td></tr>;

    // Helper to truncate description
    const truncate = (str, n = 40) => str && str.length > n ? str.slice(0, n) + '…' : str;

    return list.map(b => (
      <tr key={b.id}>
        <td>{b.id}</td>
        <td>{b.title}</td>
        {!isPerm && <td>{b.month}</td>}
        <td>{b.pokemon}</td>
        <td>{b.host}</td>
        <td>{b.reward}</td>
        <td title={b.description}>{truncate(b.description)}</td>
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

      <div style={{ margin: '16px 0' }}>
        <label htmlFor="bountyFilter" style={{ fontWeight: 600, marginRight: 8 }}>Show:</label>
        <select
          id="bountyFilter"
          value={bountyFilter}
          onChange={e => setBountyFilter(e.target.value)}
          className={styles.adminInput}
          style={{ width: 140 }}
        >
          <option value="March">March</option>
          <option value="Perm">Permanent</option>
          <option value="Claimed">Claimed</option>
        </select>
      </div>


      {bountyFilter === "March" && (
        <>
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
        </>
      )}

      {bountyFilter === "Perm" && (
        <>
          <h4>Permanent Bounties</h4>
          <div className={styles.tableWrapper}>
            <table className={styles.shinyTable}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  {/* No Month column for Perm */}
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
        </>
      )}

      {bountyFilter === "Claimed" && ( (claimedBounties["March"]?.length > 0 || claimedBounties["Perm"]?.length > 0) ? (
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
                    {/* No Month column for Perm */}
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
      ) : (
        <div className={styles.hintText} style={{margin: '16px 0'}}>No claimed bounties.</div>
      ))}
    </div>
  );
}
