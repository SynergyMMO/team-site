import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useAdminDB from '../hooks/useAdminDatabase'; // unified DB hook
import styles from './CurrentMembers.module.css';

export default function CurrentMembers({ auth }) {
  const navigate = useNavigate();
  const db = useAdminDB(auth); // unified hook
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [newPlayer, setNewPlayer] = useState({ name: '' });
  const [showMembers, setShowMembers] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // ------------------ Helpers ------------------
  const normalize = n => n?.toString().trim().replace(/\s+/g, ' ').toLowerCase();

  // ------------------ Load Data Once ------------------
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        await db.loadMembers();
        if (db.loadDatabase) await db.loadDatabase();
      } catch (err) {
        console.error("Failed to load members or database:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();

    return () => { cancelled = true; };
  }, [db.loadMembers, db.loadDatabase]);

  // ------------------ Computed Values ------------------
  const shinyOwners = useMemo(() => {
    return Object.entries(db.database || {})
      .filter(([_, player]) => player.shinies && Object.keys(player.shinies).length > 0)
      .map(([name]) => name);
  }, [db.database]);

  const memberNames = db.members.map(m => m.name);
  const memberNamesNorm = new Set(memberNames.map(normalize));
  const databaseNames = Object.keys(db.database || {});
  const databaseNamesNorm = new Set(databaseNames.map(normalize));

  const notInTeam = shinyOwners.filter(owner => !memberNamesNorm.has(normalize(owner)));
  const notInDatabase = memberNames.filter(name => !databaseNamesNorm.has(normalize(name)));

  const filteredMembers = db.members.filter(player =>
    normalize(player.name).includes(normalize(search))
  );

  // ------------------ Handlers ------------------
  const handleEdit = player => setEditingPlayer(player);
  const handleDelete = playerId => db.deleteMember(playerId);
  const handleSaveEdit = updatedPlayer => {
    db.updateMember(updatedPlayer);
    setEditingPlayer(null);
  };
  const handleAdd = async () => {
    if (!newPlayer.name.trim()) return;

    if (!auth || (!auth.username && !auth.name)) {
      console.error("Auth is missing! Cannot add member.");
      return;
    }

    try {
      const success = await db.addMember(newPlayer); // addMember returns undefined, we can wrap saveMembers
      if (!success) console.error("Failed to add member. Check server logs or network.");
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
          {loading ? (
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
                {filteredMembers.map(player => (
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
                        <input
                          value={editingPlayer.details || ''}
                          onChange={e =>
                            setEditingPlayer({ ...editingPlayer, details: e.target.value })
                          }
                          placeholder="Details"
                        />
                        <button onClick={() => handleSaveEdit(editingPlayer)}>Save</button>
                        <button onClick={() => setEditingPlayer(null)}>Cancel</button>
                      </div>
                    ) : (
                      <div>
                        <span>{player.name}{player.details ? ` - ${player.details}` : ''}</span>
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

      <div>
        <h2>Add New Player</h2>
        <input
          placeholder="Name"
          value={newPlayer.name}
          onChange={e => setNewPlayer({ ...newPlayer, name: e.target.value })}
        />
        <button onClick={handleAdd}>Add</button>
      </div>


      {notInTeam.length > 0 && (
        <div>
          <h2>Not in team</h2>
          <ul>
            {notInTeam.map(owner => <li key={owner}>{owner}</li>)}
          </ul>
        </div>
      )}

      {notInDatabase.length > 0 && (
        <div>
          <h2>Not in database</h2>
          <ul>
            {notInDatabase.map(name => <li key={name}>{name}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
