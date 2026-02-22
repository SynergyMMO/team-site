import { useState } from 'react';

// Use your actual Worker URLs here
const API = {
  currentMembers: 'https://adminpage.hypersmmo.workers.dev/admin/current-members',
  updateCurrentMembers: 'https://adminpage.hypersmmo.workers.dev/admin/update-current-members',
};

export default function useCurrentMembersDB(auth) {
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load members from Worker
  async function loadMembers() {
    setIsLoading(true);
    try {
      const response = await fetch(API.currentMembers, { method: 'GET' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      // Convert array of strings to objects for React list
      setMembers(data.map((name, index) => ({ id: index.toString(), name })));
    } catch (err) {
      console.error("Failed to load members:", err);
      setMembers([]);
    }
    setIsLoading(false);
  }

  // Save full members list to Worker
  async function saveMembers(newMembers, actionDescription) {
    if (!auth?.username || !auth?.password) {
      console.warn("Admin auth missing");
      return false;
    }

    // Convert back to array of strings
    const namesArray = newMembers.map(m => m.name);

    try {
      const response = await fetch(API.updateCurrentMembers, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: auth.username,
          password: auth.password,
          data: namesArray,
          action: actionDescription || "Updated current members",
        }),
      });
      const result = await response.json();
      if (result.success) {
        // Rebuild members array with IDs for React
        setMembers(namesArray.map((name, index) => ({ id: index.toString(), name })));
        return true;
      } else {
        console.error("Failed to save members:", result.error);
        return false;
      }
    } catch (err) {
      console.error("Error saving members:", err);
      return false;
    }
  }

  async function addMember(player) {
    const newList = [...members, { ...player, id: Date.now().toString() }];
    await saveMembers(newList, `Added member: ${player.name}`);
  }

  async function updateMember(updatedPlayer) {
    const newList = members.map(p => (p.id === updatedPlayer.id ? updatedPlayer : p));
    await saveMembers(newList, `Updated member: ${updatedPlayer.name}`);
  }

  async function deleteMember(playerId) {
    const newList = members.filter(p => p.id !== playerId);
    await saveMembers(newList, `Deleted member ID: ${playerId}`);
  }

  return {
    members,
    isLoading,
    loadMembers,
    addMember,
    updateMember,
    deleteMember,
  };
}
