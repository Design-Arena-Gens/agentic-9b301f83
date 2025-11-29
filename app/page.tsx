"use client";

import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import dayjs from "dayjs";

type TrainingFocus =
  | "Strength"
  | "Hypertrophy"
  | "Conditioning"
  | "Mobility"
  | "Skill"
  | "Recovery";

type Intensity = "Low" | "Medium" | "High";

type Session = {
  id: string;
  name: string;
  focus: TrainingFocus;
  intensity: Intensity;
  day: DayKey;
  start: string;
  duration: number;
  location: string;
  notes?: string;
  completed: boolean;
};

type DayKey =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

const STORAGE_KEY = "gym-scheduler-sessions-v1";

const DAYS: DayKey[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
];

const TRAINING_FOCI: TrainingFocus[] = [
  "Strength",
  "Hypertrophy",
  "Conditioning",
  "Mobility",
  "Skill",
  "Recovery"
];

const INTENSITIES: Intensity[] = ["Low", "Medium", "High"];

const SESSION_TEMPLATES: Array<
  Pick<
    Session,
    "name" | "focus" | "intensity" | "duration" | "notes" | "location"
  >
> = [
  {
    name: "Lower Body Power",
    focus: "Strength",
    intensity: "High",
    duration: 75,
    location: "Main Weight Room",
    notes:
      "Hang power cleans, front squats, speed deadlifts, sled pushes. Finish with core anti-rotation."
  },
  {
    name: "Upper Body Push-Pull",
    focus: "Hypertrophy",
    intensity: "Medium",
    duration: 65,
    location: "Training Floor",
    notes:
      "Superset incline bench + chest-supported rows. Giant set shoulders + arms. Finish with accessory chest/back."
  },
  {
    name: "Tempo Run + Intervals",
    focus: "Conditioning",
    intensity: "High",
    duration: 50,
    location: "Track / Treadmill",
    notes:
      "10 min build, 3x8 min @ goal pace with 2 min float, finish with 6x30s hard sprints."
  },
  {
    name: "Controlled Mobility Flow",
    focus: "Mobility",
    intensity: "Low",
    duration: 40,
    location: "Studio B",
    notes:
      "CARS sequence, dynamic hip openers, thoracic rotation work, loaded carries for range control."
  },
  {
    name: "Olympic Lifting Technique",
    focus: "Skill",
    intensity: "Medium",
    duration: 55,
    location: "Platform Area",
    notes:
      "Snatch technical ladder, pause variations, jerk footwork, pulls with tempo focus."
  },
  {
    name: "Active Recovery Ride",
    focus: "Recovery",
    intensity: "Low",
    duration: 35,
    location: "Spin Room",
    notes:
      "Zone 2 spin, breathing drills, finish with light band work and foam rolling."
  }
];

const FOCUS_COLORS: Record<TrainingFocus, string> = {
  Strength: "#f97316",
  Hypertrophy: "#ef4444",
  Conditioning: "#2563eb",
  Mobility: "#14b8a6",
  Skill: "#a855f7",
  Recovery: "#0ea5e9"
};

const INTENSITY_BADGES: Record<Intensity, string> = {
  Low: "var(--accent)",
  Medium: "#facc15",
  High: "#ef4444"
};

const DEFAULT_SESSION: Omit<Session, "id"> = {
  name: "Untitled Session",
  focus: "Strength",
  intensity: "Medium",
  day: "Monday",
  start: "07:00",
  duration: 60,
  location: "Main Floor",
  notes: "",
  completed: false
};

function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function loadSessions(): Session[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return suggestBalancedWeek();
    }
    const parsed = JSON.parse(raw) as Session[];
    return parsed.map((session) => ({
      ...session,
      id: session.id ?? generateId(),
      completed: Boolean(session.completed)
    }));
  } catch (error) {
    console.warn("Failed to parse stored sessions", error);
    return suggestBalancedWeek();
  }
}

function suggestBalancedWeek(): Session[] {
  const daysSequence: DayKey[] = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday"
  ];
  const baseTimes = ["06:30", "07:00", "18:00", "09:00", "08:30", "10:00"];
  return SESSION_TEMPLATES.slice(0, 6).map((template, index) => ({
    id: generateId(),
    day: daysSequence[index % daysSequence.length],
    start: baseTimes[index % baseTimes.length],
    completed: false,
    ...template
  }));
}

function saveSessions(sessions: Session[]) {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function formatDuration(minutes: number) {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hrs} hr${hrs > 1 ? "s" : ""}`;
  }
  return `${hrs}h ${mins}m`;
}

function getEndTime(start: string, duration: number) {
  return dayjs(`2020-01-01T${start}`).add(duration, "minute").format("HH:mm");
}

export default function Page() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [draft, setDraft] = useState<Omit<Session, "id">>({
    ...DEFAULT_SESSION
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    setSessions(loadSessions());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!sessions.length) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    saveSessions(sessions);
  }, [sessions]);

  const byDay = useMemo(() => {
    return DAYS.map((day) => ({
      day,
      sessions: sessions
        .filter((session) => session.day === day)
        .sort((a, b) => a.start.localeCompare(b.start))
    }));
  }, [sessions]);

  const focusVolume = useMemo(() => {
    return TRAINING_FOCI.map((focus) => {
      const total = sessions
        .filter((session) => session.focus === focus)
        .reduce((sum, session) => sum + session.duration, 0);
      return {
        focus,
        total,
        completed: sessions
          .filter((session) => session.focus === focus && session.completed)
          .reduce((sum, session) => sum + session.duration, 0)
      };
    });
  }, [sessions]);

  const weeklyMinutes = useMemo(
    () => sessions.reduce((sum, session) => sum + session.duration, 0),
    [sessions]
  );

  function handleChange(
    key: keyof Omit<Session, "id">,
    value: string | number | boolean
  ) {
    setDraft((prev) => ({
      ...prev,
      [key]: value
    }));
  }

  function resetForm() {
    setDraft({ ...DEFAULT_SESSION });
    setEditingId(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload: Session = {
      id: editingId ?? generateId(),
      ...draft
    };
    setSessions((prev) => {
      const next = editingId
        ? prev.map((session) =>
            session.id === editingId ? { ...session, ...payload } : session
          )
        : [...prev, payload];
      return next.sort((a, b) => {
        if (a.day === b.day) {
          return a.start.localeCompare(b.start);
        }
        return DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
      });
    });
    resetForm();
  }

  function handleEdit(session: Session) {
    const { id: _id, ...rest } = session;
    setDraft({
      ...rest,
      notes: rest.notes ?? "",
      location: rest.location ?? DEFAULT_SESSION.location
    });
    setEditingId(session.id);
  }

  function handleDelete(id: string) {
    setSessions((prev) => prev.filter((session) => session.id !== id));
    if (editingId === id) {
      resetForm();
    }
  }

  function toggleCompleted(id: string) {
    setSessions((prev) =>
      prev.map((session) =>
        session.id === id
          ? {
              ...session,
              completed: !session.completed
            }
          : session
      )
    );
  }

  function applyTemplate(template: (typeof SESSION_TEMPLATES)[number]) {
    setDraft((prev) => ({
      ...prev,
      ...template
    }));
  }

  function autoBalance() {
    setSessions(suggestBalancedWeek());
    resetForm();
  }

  return (
    <main>
      <div className="container">
        <header className="panel">
          <div className="hero">
            <div className="hero-copy">
              <h1>Gym Scheduler</h1>
              <p>
                Build a training week that aligns with your goals, balances
                intensity, and respects recovery. Save, adjust, and track
                sessions without leaving the browser.
              </p>
            </div>
            <div className="hero-meta">
              <div className="hero-meta-card">
                <span className="meta-label">Weekly Volume</span>
                <strong>{formatDuration(weeklyMinutes)}</strong>
              </div>
              <div className="hero-meta-card">
                <span className="meta-label">Sessions Planned</span>
                <strong>{sessions.length}</strong>
              </div>
              <div className="hero-meta-card">
                <span className="meta-label">Completion Rate</span>
                <strong>
                  {sessions.length
                    ? Math.round(
                        (sessions.filter((session) => session.completed).length /
                          sessions.length) *
                          100
                      )
                    : 0}
                  %
                </strong>
              </div>
            </div>
          </div>
        </header>

        <section className="grid-two">
          <aside className="panel form-panel">
            <h2>{editingId ? "Edit Session" : "Add Session"}</h2>
            <form className="scheduler-form" onSubmit={handleSubmit}>
              <div className="field">
                <label>Session name</label>
                <input
                  value={draft.name}
                  onChange={(event) =>
                    handleChange("name", event.target.value.slice(0, 60))
                  }
                  required
                  placeholder="e.g. Lower body strength"
                />
              </div>
              <div className="field-group">
                <div className="field">
                  <label>Focus</label>
                  <select
                    value={draft.focus}
                    onChange={(event) =>
                      handleChange(
                        "focus",
                        event.target.value as TrainingFocus
                      )
                    }
                  >
                    {TRAINING_FOCI.map((focus) => (
                      <option key={focus} value={focus}>
                        {focus}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Intensity</label>
                  <select
                    value={draft.intensity}
                    onChange={(event) =>
                      handleChange(
                        "intensity",
                        event.target.value as Intensity
                      )
                    }
                  >
                    {INTENSITIES.map((intensity) => (
                      <option key={intensity} value={intensity}>
                        {intensity}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="field-group">
                <div className="field">
                  <label>Day</label>
                  <select
                    value={draft.day}
                    onChange={(event) =>
                      handleChange("day", event.target.value as DayKey)
                    }
                  >
                    {DAYS.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Start</label>
                  <input
                    type="time"
                    value={draft.start}
                    onChange={(event) => handleChange("start", event.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Duration</label>
                  <input
                    type="number"
                    min={10}
                    max={200}
                    step={5}
                    value={draft.duration}
                    onChange={(event) =>
                      handleChange("duration", Number(event.target.value))
                    }
                  />
                  <span className="hint">minutes</span>
                </div>
              </div>
              <div className="field">
                <label>Location</label>
                <input
                  value={draft.location}
                  placeholder="e.g. Strength bay, Studio, Track"
                  onChange={(event) =>
                    handleChange("location", event.target.value.slice(0, 60))
                  }
                />
              </div>
              <div className="field">
                <label>Notes</label>
                <textarea
                  rows={3}
                  value={draft.notes}
                  placeholder="Key movements, rep ranges, reminders..."
                  onChange={(event) =>
                    handleChange("notes", event.target.value.slice(0, 220))
                  }
                />
              </div>
              <div className="actions">
                <button type="submit" className="primary">
                  {editingId ? "Update session" : "Add to schedule"}
                </button>
                <button type="button" className="ghost" onClick={resetForm}>
                  Reset
                </button>
                <button type="button" className="ghost" onClick={autoBalance}>
                  Auto-balance week
                </button>
              </div>
            </form>

            <div>
              <h3>Quick templates</h3>
              <div className="templates">
                {SESSION_TEMPLATES.map((template) => (
                  <button
                    key={template.name}
                    type="button"
                    className="template-card"
                    onClick={() => applyTemplate(template)}
                  >
                    <span
                      className="template-focus"
                      style={{ backgroundColor: FOCUS_COLORS[template.focus] }}
                    />
                    <div>
                      <strong>{template.name}</strong>
                      <div className="template-meta">
                        <span>{template.focus}</span>
                        <span>•</span>
                        <span>{template.intensity} intensity</span>
                        <span>•</span>
                        <span>{formatDuration(template.duration)}</span>
                      </div>
                      <p>{template.notes}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div className="grid-stack">
            <section className="panel summary-panel">
              <h2>Focus balance</h2>
              <ul className="focus-list">
                {focusVolume.map(({ focus, total, completed }) => (
                  <li key={focus}>
                    <div className="focus-label">
                      <span
                        className="focus-dot"
                        style={{ backgroundColor: FOCUS_COLORS[focus] }}
                      />
                      <strong>{focus}</strong>
                    </div>
                    <div className="focus-bars">
                      <div
                        className="focus-bar planned"
                        style={{
                          width: `${Math.min(total / (weeklyMinutes || 1), 1) * 100}%`,
                          background: `${FOCUS_COLORS[focus]}22`
                        }}
                      />
                      <div
                        className="focus-bar completed"
                        style={{
                          width: `${Math.min(
                            completed / (weeklyMinutes || 1),
                            1
                          ) * 100}%`,
                          background: `${FOCUS_COLORS[focus]}`
                        }}
                      />
                    </div>
                    <span className="focus-duration">
                      {formatDuration(total)} planned ·{" "}
                      {formatDuration(completed)} completed
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="panel schedule-panel">
              <div className="schedule-head">
                <h2>Weekly schedule</h2>
                <span className="tip">
                  Click a session to edit. Toggle completion once finished.
                </span>
              </div>

              <div className="schedule-grid">
                {byDay.map(({ day, sessions: daySessions }) => (
                  <div key={day} className="schedule-column">
                    <header>
                      <span>{day}</span>
                      <small>
                        {formatDuration(
                          daySessions.reduce(
                            (sum, session) => sum + session.duration,
                            0
                          )
                        )}
                      </small>
                    </header>
                    <div className="session-stack">
                      {daySessions.map((session) => (
                        <article
                          key={session.id}
                          className={clsx("session-card", {
                            completed: session.completed
                          })}
                          style={{
                            borderLeftColor: FOCUS_COLORS[session.focus]
                          }}
                          onClick={() => handleEdit(session)}
                        >
                          <div className="session-top">
                            <div>
                              <strong>{session.name}</strong>
                              <div className="session-time">
                                <span>{session.start}</span>
                                <span>–</span>
                                <span>{getEndTime(session.start, session.duration)}</span>
                                <span>•</span>
                                <span>{formatDuration(session.duration)}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="toggle"
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleCompleted(session.id);
                              }}
                            >
                              <span className="visually-hidden">
                                {session.completed ? "Mark as planned" : "Mark as done"}
                              </span>
                              <input
                                type="checkbox"
                                checked={session.completed}
                                readOnly
                              />
                            </button>
                          </div>
                          <div className="session-tags">
                            <span
                              className="badge"
                              style={{ color: FOCUS_COLORS[session.focus] }}
                            >
                              {session.focus}
                            </span>
                            <span
                              className="badge intensity"
                              style={{ backgroundColor: INTENSITY_BADGES[session.intensity] }}
                            >
                              {session.intensity}
                            </span>
                            <span className="badge muted">{session.location}</span>
                          </div>
                          {session.notes && (
                            <p className="session-notes">{session.notes}</p>
                          )}
                          <div className="session-actions">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleEdit(session);
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDelete(session.id);
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </article>
                      ))}
                      {daySessions.length === 0 && (
                        <div className="empty-day">
                          <span>No sessions</span>
                          <small>Perfect slot for recovery or skill work.</small>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
