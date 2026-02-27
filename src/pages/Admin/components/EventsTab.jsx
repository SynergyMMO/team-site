// EventsTab.jsx
import { useState, useEffect } from "react";
import styles from "../Admin.module.css";
import ConfirmDialog from "./ConfirmDialog";

export default function EventsTab({ eventDB, onCreate, onEdit, onDelete, isMutating }) {
  const emptyEvent = {
    published: true,
    title: "",
    imageLink: "",
    eventType: "",
    startDate: "",
    endDate: "",
    location: "",
    duration: "",
    scoring: "",
    natureBonus: [],
    validPokemon: [],
    targetPokemon: [],
    participatingStaff: [],
    firstPlaceWinners: [],
    secondPlaceWinners: [],
    thirdPlaceWinners: [],
    fourthPlaceWinners: [],
    firstPlacePrize: [],
    secondPlacePrize: [],
    thirdPlacePrize: [],
    fourthPlacePrize: [],
    hideAndSeekDescription: "",
    hideAndSeekRules: "",
    hideAndSeekRounds: [], 
  };

  const [eventData, setEventData] = useState(emptyEvent);
  const [editingId, setEditingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [localEvents, setLocalEvents] = useState([]);
  const [categorizedEvents, setCategorizedEvents] = useState({
    ongoing: [],
    upcoming: [],
    past: [],
  });

  useEffect(() => {
    const eventsWithIds = eventDB.map((e) => ({
      ...emptyEvent,
      ...e,
      id: e.id || crypto.randomUUID(),
    }));
    setLocalEvents(eventsWithIds);
    categorizeEvents(eventsWithIds);
  }, [eventDB]);

  const toLocalDateTime = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const tzOffset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - tzOffset * 60000);
    return localDate.toISOString().slice(0, 16);
  };

  const categorizeEvents = (events) => {
    const now = new Date();
    const ongoing = [];
    const upcoming = [];
    const past = [];

    events.forEach((e) => {
      const start = new Date(e.startDate);
      const end = e.endDate ? new Date(e.endDate) : start;

      if (start <= now && now <= end) ongoing.push(e);
      else if (start > now) upcoming.push(e);
      else past.push(e);
    });

    setCategorizedEvents({ ongoing, upcoming, past });
  };

  const handleCreateOrUpdate = async () => {
    if (!eventData.title || !eventData.startDate) return;

    const payload = {
      ...eventData,
      startDate: new Date(eventData.startDate).toISOString(),
      endDate: eventData.endDate ? new Date(eventData.endDate).toISOString() : null,
    };

    let updatedEvents;
    if (editingId) {
      await onEdit(editingId, payload);
      updatedEvents = localEvents.map((e) => (e.id === editingId ? { ...e, ...payload } : e));
    } else {
      const newEvent = { ...payload, id: crypto.randomUUID() };
      await onCreate(newEvent);
      updatedEvents = [...localEvents, newEvent];
    }

    setLocalEvents(updatedEvents);
    categorizeEvents(updatedEvents);
    setEventData(emptyEvent);
    setEditingId(null);
  };

  const handleEdit = (event) => {
    setEditingId(event.id);
    setEventData({
      ...emptyEvent,
      ...event,
      startDate: toLocalDateTime(event.startDate),
      endDate: toLocalDateTime(event.endDate),
      natureBonus: event.natureBonus || [],
      validPokemon: event.validPokemon || [],
      targetPokemon: event.targetPokemon || [],
      participatingStaff: event.participatingStaff || [],
      winners: event.winners || [],
      firstPlacePrize: event.firstPlacePrize || [],
      secondPlacePrize: event.secondPlacePrize || [],
      thirdPlacePrize: event.thirdPlacePrize || [],
      fourthPlacePrize: event.fourthPlacePrize || [],
    });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    await onDelete(confirmDelete);
    const updatedEvents = localEvents.filter((e) => e.id !== confirmDelete);
    setLocalEvents(updatedEvents);
    categorizeEvents(updatedEvents);
    setConfirmDelete(null);
  };

  const addListItem = (field, defaultValue = "") =>
    setEventData((prev) => ({ ...prev, [field]: [...prev[field], defaultValue] }));

  const updateListItem = (field, index, value) => {
    const updated = [...eventData[field]];
    updated[index] = value;
    setEventData((prev) => ({ ...prev, [field]: updated }));
  };

  const removeListItem = (field, index) => {
    const updated = [...eventData[field]];
    updated.splice(index, 1);
    setEventData((prev) => ({ ...prev, [field]: updated }));
  };

  const addValidPokemon = () =>
    setEventData((prev) => ({ ...prev, validPokemon: [...prev.validPokemon, { pokemon: "", bonus: "" }] }));
  const updateValidPokemon = (index, key, value) => {
    const updated = [...eventData.validPokemon];
    updated[index][key] = value;
    setEventData((prev) => ({ ...prev, validPokemon: updated }));
  };
  const removeValidPokemon = (index) => {
    const updated = [...eventData.validPokemon];
    updated.splice(index, 1);
    setEventData((prev) => ({ ...prev, validPokemon: updated }));
  };

  const addTargetPokemon = () =>
    setEventData((prev) => ({ ...prev, targetPokemon: [...prev.targetPokemon, { pokemon: "", location: "", duration: "" }] }));
  const updateTargetPokemon = (index, key, value) => {
    const updated = [...eventData.targetPokemon];
    updated[index][key] = value;
    setEventData((prev) => ({ ...prev, targetPokemon: updated }));
  };
  const removeTargetPokemon = (index) => {
    const updated = [...eventData.targetPokemon];
    updated.splice(index, 1);
    setEventData((prev) => ({ ...prev, targetPokemon: updated }));
  };

  const addNatureBonus = () =>
    setEventData((prev) => ({ ...prev, natureBonus: [...prev.natureBonus, { nature: "", bonus: "" }] }));
  const updateNatureBonus = (index, key, value) => {
    const updated = [...eventData.natureBonus];
    updated[index][key] = value;
    setEventData((prev) => ({ ...prev, natureBonus: updated }));
  };
  const removeNatureBonus = (index) => {
    const updated = [...eventData.natureBonus];
    updated.splice(index, 1);
    setEventData((prev) => ({ ...prev, natureBonus: updated }));
  };

  const renderEventList = (events) => {
    if (!events.length) return <p className={styles.hintText}>No events</p>;
    return (
      <table className={styles.shinyTable}>
        <thead>
          <tr>
            <th>Title</th>
            <th>Event Type</th>
            <th>Start</th>
            <th>End</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id}>
              <td>{e.title}</td>
              <td>{e.eventType}</td>
              <td>{e.startDate ? new Date(e.startDate).toLocaleString() : "-"}</td>
              <td>{e.endDate ? new Date(e.endDate).toLocaleString() : "-"}</td>
              <td className={styles.actionBtns}>
                <button className={styles.editBtn} onClick={() => handleEdit(e)}>Edit</button>
                <button className={styles.deleteBtn} onClick={() => setConfirmDelete(e.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const addHideAndSeekRound = () =>
    setEventData(prev => ({ ...prev, hideAndSeekRounds: [...(prev.hideAndSeekRounds || []), { prize: '', host: '', winner: '' }] }));
  const updateHideAndSeekRound = (index, key, value) => {
    const updated = [...(eventData.hideAndSeekRounds || [])];
    updated[index][key] = value;
    setEventData(prev => ({ ...prev, hideAndSeekRounds: updated }));
  };
  const removeHideAndSeekRound = (index) => {
    const updated = [...(eventData.hideAndSeekRounds || [])];
    updated.splice(index, 1);
    setEventData(prev => ({ ...prev, hideAndSeekRounds: updated }));
  };

  return (
    <div>
      <h3>{editingId ? "Edit Event" : "Create Event"}</h3>

      <div className={styles.editSection}>
        {/* Event Type */}
        <label>Event Type:</label>
        <select
          className={styles.adminInput}
          value={eventData.eventType || ""}
          onChange={(e) => setEventData({ ...eventData, eventType: e.target.value })}
        >
          <option value="" disabled hidden>Select Event Type</option>
          <option value="catchevent">Catch Event</option>
          <option value="metronome">Metronome</option>
          <option value="grouphunt">Group Hunt</option>

          <option value="hideandseek">Hide and Seek</option>
        </select>


        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
          <input
            type="checkbox"
            checked={!!eventData.published}
            onChange={e => setEventData({ ...eventData, published: e.target.checked })}
            style={{ marginRight: '8px' }}
          />
          Published
        </label>

        <label>Name:</label>
        <input
          type="text"
          className={styles.adminInput}
          value={eventData.title || ""}
          onChange={(e) => setEventData({ ...eventData, title: e.target.value })}
        />

        <label>Image Link:</label>
        <input
          type="text"
          className={styles.adminInput}
          value={eventData.imageLink || ""}
          onChange={(e) => setEventData({ ...eventData, imageLink: e.target.value })}
        />


      <label>Location:</label>
      <input
        type="text"
        className={styles.adminInput}
        value={eventData.location || ""}
        onChange={(e) => setEventData({ ...eventData, location: e.target.value })}
      />

        <label>Duration:</label>
        <input
          type="text"
          className={styles.adminInput}
          value={eventData.duration || ""}
          onChange={(e) => setEventData({ ...eventData, duration: e.target.value })}
        />

        {eventData.eventType === "hideandseek" && (
          <>
            <label>Description:</label>
            <textarea
              className={styles.adminInput}
              value={eventData.hideAndSeekDescription || ""}
              onChange={e => setEventData({ ...eventData, hideAndSeekDescription: e.target.value })}
            />

            <label>Date/Time:</label>
            <input
              type="datetime-local"
              className={styles.adminInput}
              value={eventData.startDate}
              onChange={e => setEventData({ ...eventData, startDate: e.target.value })}
              onFocus={e => e.target.showPicker?.()}
            />
            <label>Rounds:</label>
            {(eventData.hideAndSeekRounds || []).map((round, i) => (
              <div key={i} className={styles.inputRow}>
                <input
                  placeholder="Prize"
                  className={styles.adminInput}
                  value={round.prize || ""}
                  onChange={e => updateHideAndSeekRound(i, "prize", e.target.value)}
                />
                <input
                  placeholder="Prize Image (URL)"
                  className={styles.adminInput}
                  value={round.prizeImage || ""}
                  onChange={e => updateHideAndSeekRound(i, "prizeImage", e.target.value)}
                />
                <input
                  placeholder="Host"
                  className={styles.adminInput}
                  value={round.host || ""}
                  onChange={e => updateHideAndSeekRound(i, "host", e.target.value)}
                />
                <input
                  placeholder="Winner"
                  className={styles.adminInput}
                  value={round.winner || ""}
                  onChange={e => updateHideAndSeekRound(i, "winner", e.target.value)}
                />
                <button className={styles.deleteBtn} onClick={() => removeHideAndSeekRound(i)}>Remove</button>
              </div>
            ))}
            <button className={styles.editBtn} onClick={addHideAndSeekRound}>Add Round</button>

            <label>Rules:</label>
            <textarea
              className={styles.adminInput}
              value={eventData.hideAndSeekRules || ""}
              onChange={e => setEventData({ ...eventData, hideAndSeekRules: e.target.value })}
            />
          </>
        )}
        {eventData.eventType === "catchevent" && (
          <>
            <label>Scoring:</label>
            <input
              type="text"
              className={styles.adminInput}
              value={eventData.scoring || ""}
              onChange={(e) => setEventData({ ...eventData, scoring: e.target.value })}
            />
          </>
        )}

        {eventData.eventType !== "hideandseek" && (
          <>
            <label>Start Date & Time:</label>
            <input
              type="datetime-local"
              className={styles.adminInput}
              value={eventData.startDate}
              onChange={(e) => setEventData({ ...eventData, startDate: e.target.value })}
              onFocus={(e) => e.target.showPicker?.()}
            />

            <label>End Date & Time:</label>
            <input
              type="datetime-local"
              className={styles.adminInput}
              value={eventData.endDate}
              onChange={(e) => setEventData({ ...eventData, endDate: e.target.value })}
              onFocus={(e) => e.target.showPicker?.()}
            />
          </>
        )}

        {eventData.eventType === "catchevent" && (
          <>
            <label>Nature Bonus:</label>
            {eventData.natureBonus.map((n, i) => (
              <div key={i} className={styles.inputRow}>
                <input
                  placeholder="Nature"
                  className={styles.adminInput}
                  value={n.nature || ""}
                  onChange={(e) => updateNatureBonus(i, "nature", e.target.value)}
                />
                <input
                  placeholder="Bonus"
                  className={styles.adminInput}
                  value={n.bonus || ""}
                  onChange={(e) => updateNatureBonus(i, "bonus", e.target.value)}
                />
                <button className={styles.deleteBtn} onClick={() => removeNatureBonus(i)}>Remove</button>
              </div>
            ))}
            <button className={styles.editBtn} onClick={addNatureBonus}>Add Nature</button>

            <label>Valid Pokémon:</label>
            {eventData.validPokemon.map((p, i) => (
              <div key={i} className={styles.inputRow}>
                <input
                  placeholder="Pokémon"
                  className={styles.adminInput}
                  value={p.pokemon || ""}
                  onChange={(e) => updateValidPokemon(i, "pokemon", e.target.value)}
                />
                <input
                  placeholder="Bonus"
                  className={styles.adminInput}
                  value={p.bonus || ""}
                  onChange={(e) => updateValidPokemon(i, "bonus", e.target.value)}
                />
                <button className={styles.deleteBtn} onClick={() => removeValidPokemon(i)}>Remove</button>
              </div>
            ))}
            <button className={styles.editBtn} onClick={addValidPokemon}>Add Pokémon</button>
          </>
        )}

        {eventData.eventType === "grouphunt" && (
          <>
            <label>Target Pokémon(s):</label>
            {eventData.targetPokemon.map((t, i) => (
              <div key={i} className={styles.inputRow}>
                <input
                  placeholder="Pokémon"
                  className={styles.adminInput}
                  value={t.pokemon || ""}
                  onChange={(e) => updateTargetPokemon(i, "pokemon", e.target.value)}
                />
                <input
                  placeholder="Location"
                  className={styles.adminInput}
                  value={t.location || ""}
                  onChange={(e) => updateTargetPokemon(i, "location", e.target.value)}
                />
                <input
                  placeholder="Duration"
                  className={styles.adminInput}
                  value={t.duration || ""}
                  onChange={(e) => updateTargetPokemon(i, "duration", e.target.value)}
                />
                <button className={styles.deleteBtn} onClick={() => removeTargetPokemon(i)}>Remove</button>
              </div>
            ))}
            <button className={styles.editBtn} onClick={addTargetPokemon}>Add Target Pokémon</button>
          </>
        )}

        {eventData.eventType !== "hideandseek" && (
          <>
            <label>Participating Staff:</label>
            {eventData.participatingStaff.map((s, i) => (
              <div key={i} className={styles.inputRow}>
                <input
                  placeholder="Staff Name"
                  className={styles.adminInput}
                  value={s || ""}
                  onChange={(e) => updateListItem("participatingStaff", i, e.target.value)}
                />
                <button className={styles.deleteBtn} onClick={() => removeListItem("participatingStaff", i)}>Remove</button>
              </div>
            ))}
            <button className={styles.editBtn} onClick={() => addListItem("participatingStaff")}>Add Staff</button>

            {["firstPlaceWinners", "secondPlaceWinners", "thirdPlaceWinners", "fourthPlaceWinners"].map((field, idx) => (
              <div key={field}>
                <label>{["1st", "2nd", "3rd", "4th"][idx]} Place Winner(s):</label>
                {eventData[field].map((w, i) => (
                  <div key={i} className={styles.inputRow}>
                    <input
                      placeholder="Winner Name"
                      className={styles.adminInput}
                      value={w || ""}
                      onChange={(e) => updateListItem(field, i, e.target.value)}
                    />
                    <button className={styles.deleteBtn} onClick={() => removeListItem(field, i)}>Remove</button>
                  </div>
                ))}
                <button className={styles.editBtn} onClick={() => addListItem(field)}>Add Winner</button>
              </div>
            ))}

            {["firstPlacePrize", "secondPlacePrize", "thirdPlacePrize", "fourthPlacePrize"].map((field, idx) => (
              <div key={field}>
                <label>{["1st", "2nd", "3rd", "4th"][idx]} Place Prize(s):</label>
                {eventData[field].map((p, i) => (
                  <div key={i} className={styles.inputRow}>
                    <input
                      placeholder="Prize"
                      className={styles.adminInput}
                      value={p || ""}
                      onChange={(e) => updateListItem(field, i, e.target.value)}
                    />
                    <button className={styles.deleteBtn} onClick={() => removeListItem(field, i)}>Remove</button>
                  </div>
                ))}
                <button className={styles.editBtn} onClick={() => addListItem(field)}>Add Prize</button>
              </div>
            ))}
          </>
        )}

        <button
          className={styles.editBtn}
          onClick={handleCreateOrUpdate}
          disabled={isMutating || !eventData.title || !eventData.startDate}
        >
          {isMutating ? "Saving..." : editingId ? "Save Changes" : "Create Event"}
        </button>
      </div>

      {/* Event Lists */}
      <h3>Ongoing Events</h3>
      {renderEventList(categorizedEvents.ongoing)}
      <h3>Upcoming Events</h3>
      {renderEventList(categorizedEvents.upcoming)}
      <h3>Past Events</h3>
      {renderEventList(categorizedEvents.past)}

      {/* Confirm Delete */}
      {confirmDelete && (
        <ConfirmDialog
          title="Delete Event"
          message="Are you sure you want to delete this event?"
          confirmLabel="Delete"
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
