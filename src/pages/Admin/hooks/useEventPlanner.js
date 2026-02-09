const WORKER_BASE = 'https://adminpage.hypersmmo.workers.dev/admin'


export async function createEvent(fields) {
  if (!fields || typeof fields !== "object") {
    throw new Error("createEvent requires an object of fields");
  }

  const payload = {
    ...fields,
    createdAt: new Date().toISOString(),
  };

  const res = await fetch(`${WORKER_BASE}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create event: ${text}`);
  }

  return res.json();
}

/** Fetch all events from Cloudflare Worker */
export async function fetchEvents() {
  const res = await fetch(`${WORKER_BASE}/events`);

  if (!res.ok) {
    throw new Error("Failed to fetch events");
  }

  return res.json();
}

export function splitEventsByTime(events = []) {
  const now = new Date();

  const ongoing = [];
  const upcoming = [];
  const past = [];

  for (const event of events) {
    const start = new Date(event.date);
    const end = event.endDate ? new Date(event.endDate) : start;

    if (start <= now && end >= now) {
      ongoing.push(event);
    } else if (start > now) {
      upcoming.push(event);
    } else {
      past.push(event);
    }
  }

  return {
    ONGOING: ongoing.sort((a, b) => new Date(a.date) - new Date(b.date)),
    UPCOMING: upcoming.sort((a, b) => new Date(a.date) - new Date(b.date)),
    "PAST EVENTS": past.sort((a, b) => new Date(b.date) - new Date(a.date)),
  };
}


export function renderEventSections(container, split) {
  container.innerHTML = "";

  for (const [section, list] of Object.entries(split)) {
    const sectionEl = document.createElement("div");

    const title = document.createElement("h2");
    title.textContent = section;
    sectionEl.appendChild(title);

    if (!list.length) {
      const empty = document.createElement("p");
      empty.textContent = "No events";
      sectionEl.appendChild(empty);
    }

    for (const ev of list) {
      const item = document.createElement("div");
      item.className = "event-card";

      item.innerHTML = `
        <h3>${ev.name ?? "Unnamed Event"}</h3>
        <p><strong>Date:</strong> ${new Date(ev.date).toLocaleString()}</p>
        ${ev.description ? `<p>${ev.description}</p>` : ""}
      `;

      sectionEl.appendChild(item);
    }

    container.appendChild(sectionEl);
  }
}


export async function loadAndRenderEvents(container) {
  const events = await fetchEvents();
  const split = splitEventsByTime(events);
  renderEventSections(container, split);
}
