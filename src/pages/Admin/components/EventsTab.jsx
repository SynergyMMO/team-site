// EventsTab.jsx
import { useState, useEffect } from "react";
import styles from "../Admin.module.css";
import ConfirmDialog from "./ConfirmDialog";

export default function EventsTab({ eventDB, onCreate, onEdit, onDelete, isMutating }) {
  const emptyEvent = {
    title: "",
    imageLink: "",
    startDate: "",
    endDate: "",
    location: "",
    duration: "",
    scoring: "",
    eventType: "",
    natureBonus: [],
    validPokemon: [],
    participatingStaff: [],
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
      ...e,
      id: e.id || crypto.randomUUID(),
    }));
    setLocalEvents(eventsWithIds);
    categorizeEvents(eventsWithIds);
  }, [eventDB]);

  // ---------------- Helpers ----------------
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

  // ---------------- Form Handlers ----------------
  const handleCreateOrUpdate = async () => {
    if (!eventData.title || !eventData.startDate) return;

    const adminTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const payload = {
      ...eventData,
      startDate: new Date(eventData.startDate).toISOString(),
      endDate: eventData.endDate ? new Date(eventData.endDate).toISOString() : null,
      timezone: adminTimezone,
      eventType: eventData.eventType || "",
      natureBonus: eventData.natureBonus.map(({ nature, bonus }) => ({
        nature: nature || "",
        bonus: bonus || "",
      })),
      validPokemon: eventData.validPokemon.map(({ pokemon, bonus }) => ({
        pokemon: pokemon || "",
        bonus: bonus || "",
      })),
      participatingStaff: eventData.participatingStaff.map((s) => s || ""),
      firstPlacePrize: eventData.firstPlacePrize.map((p) => p || ""),
      secondPlacePrize: eventData.secondPlacePrize.map((p) => p || ""),
      thirdPlacePrize: eventData.thirdPlacePrize.map((p) => p || ""),
      fourthPlacePrize: eventData.fourthPlacePrize.map((p) => p || ""),
    };

    let updatedEvents;

    if (editingId) {
      await onEdit(editingId, payload);
      updatedEvents = localEvents.map((e) =>
        e.id === editingId ? { ...e, ...payload } : e
      );
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
      title: event.title || "",
      imageLink: event.imageLink || "",
      startDate: toLocalDateTime(event.startDate) || "",
      endDate: toLocalDateTime(event.endDate) || "",
      location: event.location || "",
      duration: event.duration || "",
      scoring: event.scoring || "",
      eventType: event.eventType || "",
      natureBonus: Array.isArray(event.natureBonus)
        ? event.natureBonus.map((n) => ({ nature: n.nature || "", bonus: n.bonus || "" }))
        : [{ nature: "", bonus: event.natureBonus || "" }],
      validPokemon:
        event.validPokemon?.length > 0
          ? event.validPokemon.map((p) => ({ pokemon: p.pokemon || "", bonus: p.bonus || "" }))
          : [{ pokemon: "", bonus: "" }],
      participatingStaff: event.participatingStaff?.length > 0 ? event.participatingStaff : [""],
      firstPlacePrize: event.firstPlacePrize?.length > 0 ? event.firstPlacePrize : [""],
      secondPlacePrize: event.secondPlacePrize?.length > 0 ? event.secondPlacePrize : [""],
      thirdPlacePrize: event.thirdPlacePrize?.length > 0 ? event.thirdPlacePrize : [""],
      fourthPlacePrize: event.fourthPlacePrize?.length > 0 ? event.fourthPlacePrize : [""],
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
  const addListItem = (field) =>
    setEventData((prev) => ({ ...prev, [field]: [...prev[field], ""] }));

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
            <th>Start</th>
            <th>End</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id}>
              <td>{e.title}</td>
              <td>
                {e.startDate
                  ? new Date(e.startDate).toLocaleString(undefined, {
                      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    })
                  : "-"}
              </td>
              <td>
                {e.endDate
                  ? new Date(e.endDate).toLocaleString(undefined, {
                      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    })
                  : "-"}
              </td>
              <td>
                <button onClick={() => handleEdit(e)}>Edit</button>
                <button className={styles.deleteBtn} onClick={() => setConfirmDelete(e.id)}>
                  Delete
                </button>
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

      {/* Event Type at the top */}
      <div>
        <label>Event Type:</label>
        <select
          value={eventData.eventType || ""}
          onChange={(e) => setEventData({ ...eventData, eventType: e.target.value })}
        >
          <option value="" disabled hidden>
            Select Event Type
          </option>
          <option value="catchevent">Catch Event</option>
          <option value="battleevent">Battle Event</option>
        </select>
      </div>

      {/* Text Inputs */}
      {[
        { label: "Title", field: "title" },
        { label: "Image Link", field: "imageLink" },
        { label: "Location", field: "location" },
        { label: "Duration", field: "duration" },
        { label: "Scoring", field: "scoring" },
      ].map(({ label, field }) => (
        <div key={field}>
          <label>{label}:</label>
          <input
            type="text"
            value={eventData[field] || ""}
            onChange={(e) => setEventData({ ...eventData, [field]: e.target.value })}
          />
        </div>
      ))}

      {/* Date Inputs */}
      <div className="datetimeWrapper" onClick={(e) => e.currentTarget.querySelector("input").showPicker?.()}>
        <label>Start Date & Time:</label>
        <input
          type="datetime-local"
          className="datetimeInput"
          value={eventData.startDate}
          onChange={(e) => setEventData({ ...eventData, startDate: e.target.value })}
        />
      </div>

      <div className="datetimeWrapper" onClick={(e) => e.currentTarget.querySelector("input").showPicker?.()}>
        <label>End Date & Time:</label>
        <input
          type="datetime-local"
          className="datetimeInput"
          value={eventData.endDate}
          onChange={(e) => setEventData({ ...eventData, endDate: e.target.value })}
        />
      </div>

      {/* Conditional Sections based on event type */}
      {eventData.eventType === "catchevent"  && (
        <>
          {/* Nature Bonus */}
          <label>Nature Bonus (Nature → Bonus Points):</label>
          {eventData.natureBonus.map((n, i) => (
            <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "4px" }}>
              <input
                type="text"
                placeholder="Nature"
                value={n.nature || ""}
                onChange={(e) => updateNatureBonus(i, "nature", e.target.value)}
              />
              <input
                type="text"
                placeholder="Bonus Points"
                value={n.bonus || ""}
                onChange={(e) => updateNatureBonus(i, "bonus", e.target.value)}
              />
              <button type="button" onClick={() => removeNatureBonus(i)}>Remove</button>
            </div>
          ))}
          <button type="button" onClick={addNatureBonus}>Add Nature</button>

          {/* Valid Pokemon */}
          <label>Valid Pokemon (Pokemon → Bonus Points):</label>
          {eventData.validPokemon.map((p, i) => (
            <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "4px" }}>
              <input
                type="text"
                placeholder="Pokemon"
                value={p.pokemon || ""}
                onChange={(e) => updateValidPokemon(i, "pokemon", e.target.value)}
              />
              <input
                type="text"
                placeholder="Bonus Points"
                value={p.bonus || ""}
                onChange={(e) => updateValidPokemon(i, "bonus", e.target.value)}
              />
              <button type="button" onClick={() => removeValidPokemon(i)}>Remove</button>
            </div>
          ))}
          <button type="button" onClick={addValidPokemon}>Add Pokemon</button>
        </>
      )}

      {/* Participating Staff */}
      <label>Participating Staff:</label>
      {eventData.participatingStaff.map((s, i) => (
        <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "4px" }}>
          <input
            type="text"
            placeholder="Staff Name"
            value={s || ""}
            onChange={(e) => updateListItem("participatingStaff", i, e.target.value)}
          />
          <button type="button" onClick={() => removeListItem("participatingStaff", i)}>Remove</button>
        </div>
      ))}
      <button type="button" onClick={() => addListItem("participatingStaff")}>Add Staff</button>

      {/* Prizes */}
      {["firstPlacePrize", "secondPlacePrize", "thirdPlacePrize", "fourthPlacePrize"].map((field, idx) => (
        <div key={field}>
          <label>{["1st", "2nd", "3rd", "4th"][idx]} Place Prize(s):</label>
          {eventData[field].map((p, i) => (
            <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "4px" }}>
              <input
                type="text"
                placeholder="Prize"
                value={p || ""}
                onChange={(e) => updateListItem(field, i, e.target.value)}
              />
              <button type="button" onClick={() => removeListItem(field, i)}>Remove</button>
            </div>
          ))}
          <button type="button" onClick={() => addListItem(field)}>Add Prize</button>
        </div>
      ))}

      <button
        onClick={handleCreateOrUpdate}
        disabled={isMutating || !eventData.title || !eventData.startDate}
      >
        {isMutating ? "Saving..." : editingId ? "Save Changes" : "Create Event"}
      </button>

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
