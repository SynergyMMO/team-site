import { useState, useEffect, useMemo } from 'react';
import useAdminDB from '../hooks/useAdminDatabase';
import styles from './CurrentMembers.module.css';

export default function CurrentMembers({ auth }) {
  const db = useAdminDB(auth);

  const [editingPlayer, setEditingPlayer] = useState(null);
  const [detailsPlayer, setDetailsPlayer] = useState(null);
  const [detailsDraft, setDetailsDraft] = useState({ discord: '', details: '' });
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [newPlayer, setNewPlayer] = useState({ name: '' });
  const [showMembers, setShowMembers] = useState(false);
  const [search, setSearch] = useState("");

  // ------------------ Helpers ------------------
  const normalize = n => n?.toString().trim().replace(/\s+/g, ' ').toLowerCase();

  // ------------------ Load Members ------------------
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        await db.loadMembers();
        if (db.loadDatabase) await db.loadDatabase();
      } catch (err) {
        console.error("Failed to load members or database:", err);
      }
    };

    loadData();
    return () => { cancelled = true; };
  }, []);

  // ------------------ Computed Values ------------------
  const shinyOwners = useMemo(() => {
    return Object.entries(db.database || {})
      .filter(([_, player]) => player.shinies && Object.keys(player.shinies).length > 0)
      .map(([name]) => name);
  }, [db.database]);

  const memberNames = useMemo(() => db.members.map(m => m.name), [db.members]);
  const memberNamesNorm = useMemo(() => new Set(memberNames.map(normalize)), [memberNames]);
  const databaseNames = useMemo(() => Object.keys(db.database || {}), [db.database]);
  const databaseNamesNorm = useMemo(() => new Set(databaseNames.map(normalize)), [databaseNames]);

  const notInTeam = useMemo(() => shinyOwners.filter(owner => !memberNamesNorm.has(normalize(owner))), [shinyOwners, memberNamesNorm]);
  const notInDatabase = useMemo(() => memberNames.filter(name => !databaseNamesNorm.has(normalize(name))), [memberNames, databaseNamesNorm]);

  const filteredMembers = useMemo(() => {
    const normalizedSearch = normalize(search);
    return db.members
      .filter(player => normalize(player.name).includes(normalizedSearch))
      .sort((a, b) => normalize(a.name).localeCompare(normalize(b.name)));
  }, [db.members, search]);

  // ------------------ Handlers ------------------
  const handleEdit = player => setEditingPlayer(player);
  const handleDelete = playerId => db.deleteMember(playerId);
  const handleSaveEdit = updatedPlayer => {
    db.updateMember(updatedPlayer);
    setEditingPlayer(null);
  };

  const handleOpenDetails = player => {
    setDetailsPlayer(player);
    setDetailsDraft({
      discord: player.discord || '',
      details: player.details || '',
    });
    setDetailsError('');
  };

  const handleSaveDetails = async event => {
    event.preventDefault();
    setIsSavingDetails(true);
    setDetailsError('');

    try {
      const success = await db.updateMember({ ...detailsPlayer, ...detailsDraft });
      if (success) {
        setDetailsPlayer(null);
      } else {
        setDetailsError('Could not save member details. Please try again.');
      }
    } catch (err) {
      console.error('Failed to save member details:', err);
      setDetailsError('Could not save member details. Please try again.');
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handleAdd = async () => {
    if (!newPlayer.name.trim()) return;

    if (!auth || (!auth.username && !auth.name)) {
      console.error("Auth is missing! Cannot add member.");
      return;
    }

    try {
      const success = await db.addMember(newPlayer);
      if (!success) console.error("Failed to add member.");
      setNewPlayer({ name: '' });
    } catch (err) {
      console.error("Failed to add member:", err);
    }
  };

  // ------------------ Render ------------------
  return (
    <div className={styles.panel}>
      <h1>Current Members</h1>

      <button onClick={() => setShowMembers(v => !v)} style={{ marginBottom: 8 }}>
        {showMembers ? 'Hide Members' : 'Show Members'}
      </button>

      {showMembers && (
        <>
          {db.isMembersLoading ? (
            <div>Loading members…</div>
          ) : (
            <>
              <input
                type="text"
                placeholder="Search members..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ marginBottom: 12, width: '100%', maxWidth: 300 }}
              />

              <ul>
                {filteredMembers.map((player, idx) => (
                  <li key={player.id}>
                    {editingPlayer && editingPlayer.id === player.id ? (
                      <div>
                        <input
                          value={editingPlayer.name}
                          onChange={e =>
                            setEditingPlayer({ ...editingPlayer, name: e.target.value })
                          }
                          placeholder="Name"
                        />
                        <button onClick={() => handleSaveEdit(editingPlayer)}>Save</button>
                        <button onClick={() => setEditingPlayer(null)}>Cancel</button>
                      </div>
                    ) : (
                      <div>
                        <span>{idx + 1}: {player.name}</span>
                        <button onClick={() => handleOpenDetails(player)}>Details</button>
                        <button onClick={() => handleEdit(player)}>Edit</button>
                        <button onClick={() => handleDelete(player.id)}>Delete</button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      <div style={{ marginTop: 24 }}>
        <h2>Add New Player</h2>
        <input
          placeholder="Name"
          value={newPlayer.name}
          onChange={e => setNewPlayer({ ...newPlayer, name: e.target.value })}
        />
        <button onClick={handleAdd}>Add</button>
      </div>

      {detailsPlayer && (
        <div className={styles.dialogBackdrop}>
          <form
            className={styles.detailsDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="member-details-title"
            onSubmit={handleSaveDetails}
          >
            <h2 id="member-details-title">{detailsPlayer.name} Details</h2>
            <label>
              Discord
              <input
                value={detailsDraft.discord}
                onChange={e => setDetailsDraft({ ...detailsDraft, discord: e.target.value })}
                placeholder="Discord username"
              />
            </label>
            <label>
              Added Information
              <textarea
                value={detailsDraft.details}
                onChange={e => setDetailsDraft({ ...detailsDraft, details: e.target.value })}
                rows={4}
                placeholder="Additional member information"
              />
            </label>
            {detailsError && <p className={styles.error} role="alert">{detailsError}</p>}
            <div className={styles.dialogActions}>
              <button type="submit" disabled={isSavingDetails}>
                {isSavingDetails ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={() => setDetailsPlayer(null)} disabled={isSavingDetails}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {notInTeam.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h2>Not in team</h2>
          <ul>
            {notInTeam.map(owner => <li key={owner}>{owner}</li>)}
          </ul>
        </div>
      )}

      {notInDatabase.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h2>Not in database</h2>
          <ul>
            {notInDatabase.map(name => <li key={name}>{name}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
