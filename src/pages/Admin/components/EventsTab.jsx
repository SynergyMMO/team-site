// EventsTab.jsx
import { useState, useEffect } from "react";
import styles from "../Admin.module.css";
import ConfirmDialog from "./ConfirmDialog";

export default function EventsTab({ eventDB, onCreate, onEdit, onDelete, isMutating }) {
  const emptyEvent = {
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

  // ---------------- Sync localEvents with parent prop ----------------
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

  // ---------------- Create / Update ----------------
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

  // ---------------- Dynamic List Helpers ----------------
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

  // ---------------- Render Helpers ----------------
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

  // ---------------- Render ----------------
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
        </select>

        {/* Basic Inputs */}
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

        {/* Location only for non-Group Hunt */}
        {eventData.eventType !== "grouphunt" && (
          <>
            <label>Location:</label>
            <input
              type="text"
              className={styles.adminInput}
              value={eventData.location || ""}
              onChange={(e) => setEventData({ ...eventData, location: e.target.value })}
            />
          </>
        )}

        <label>Duration:</label>
        <input
          type="text"
          className={styles.adminInput}
          value={eventData.duration || ""}
          onChange={(e) => setEventData({ ...eventData, duration: e.target.value })}
        />

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

        {/* Dates */}
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

        {/* Catch Event Bonuses */}
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

        {/* Group Hunt Target Pokémon */}
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

        {/* Staff */}
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

        {/* Winners by Place */}
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

        {/* Prizes */}
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
