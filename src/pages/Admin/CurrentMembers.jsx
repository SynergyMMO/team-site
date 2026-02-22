import { useState, useEffect } from 'react';
import { useAdmin } from '../../context/AdminContext';
import useCurrentMembersDB from './hooks/useCurrentMembersDB';
import { API } from '../../api/endpoints';
import styles from './CurrentMembers.module.css';

export default function CurrentMembers() {
  const { auth } = useAdmin();
  const db = useCurrentMembersDB(auth);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [newPlayer, setNewPlayer] = useState({ name: '', details: '' });
  const [showMembers, setShowMembers] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (auth) db.loadMembers();
  }, [auth]);

  function handleEdit(player) {
    setEditingPlayer(player);
  }

  function handleDelete(playerId) {
    db.deleteMember(playerId);
  }

  function handleSaveEdit(updatedPlayer) {
    db.updateMember(updatedPlayer);
    setEditingPlayer(null);
  }

  function handleAdd() {
    db.addMember(newPlayer);
    setNewPlayer({ name: '', details: '' });
  }

  // Load shiny owners from the correct shiny database (players with at least one shiny)
  const [shinyOwners, setShinyOwners] = useState([]);
  useEffect(() => {
    fetch(API.database)
      .then(res => res.json())
      .then(data => {
        // Only include players with at least one shiny in .shinies
        const owners = Object.entries(data)
          .filter(([name, player]) => player.shinies && Object.keys(player.shinies).length > 0)
          .map(([name]) => name);
        setShinyOwners(owners);
      });
  }, []);


  // Current member names (case-insensitive set)
  const normalize = n => n && n.toString().trim().replace(/\s+/g, ' ').toLowerCase();
  const memberNames = db.members.map(m => m.name);
  const memberNamesNorm = new Set(memberNames.map(normalize));
  const shinyOwnersNorm = new Set(shinyOwners.map(normalize));

  // Not in team: shiny owners not in current members (case-insensitive, trimmed)
  const notInTeam = shinyOwners.filter(owner => !memberNamesNorm.has(normalize(owner)));
  // Not in database: current members not in shiny owners (case-insensitive, trimmed)
  const notInDatabase = memberNames.filter(name => !shinyOwnersNorm.has(normalize(name)));

  // Filtered members for search
  const filteredMembers = db.members.filter(player =>
    normalize(player.name).includes(normalize(search))
  );

  return (
    <div className={styles.panel}>
      <h1>Current Members</h1>
      <button onClick={() => setShowMembers(v => !v)} style={{ marginBottom: 8 }}>
        {showMembers ? 'Hide Members' : 'Show Members'}
      </button>
      {showMembers && (
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
                    <input value={editingPlayer.name} onChange={e => setEditingPlayer({ ...editingPlayer, name: e.target.value })} />
                    <input value={editingPlayer.details} onChange={e => setEditingPlayer({ ...editingPlayer, details: e.target.value })} />
                    <button onClick={() => handleSaveEdit(editingPlayer)}>Save</button>
                    <button onClick={() => setEditingPlayer(null)}>Cancel</button>
                  </div>
                ) : (
                  <div>
                    <span>{player.name} - {player.details}</span>
                    <button onClick={() => handleEdit(player)}>Edit</button>
                    <button onClick={() => handleDelete(player.id)}>Delete</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      <div>
        <h2>Add New Player</h2>
        <input placeholder="Name" value={newPlayer.name} onChange={e => setNewPlayer({ ...newPlayer, name: e.target.value })} />
        <input placeholder="Details" value={newPlayer.details} onChange={e => setNewPlayer({ ...newPlayer, details: e.target.value })} />
        <button onClick={handleAdd}>Add</button>
      </div>
      {/* Show missing members */}
      {notInTeam.length > 0 && (
        <div>
          <h2>Not in team</h2>
          <ul>
            {notInTeam.map(owner => (
              <li key={owner}>{owner}</li>
            ))}
          </ul>
        </div>
      )}
      {notInDatabase.length > 0 && (
        <div>
          <h2>Not in database</h2>
          <ul>
            {notInDatabase.map(name => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
