/* SolarTwin — People tab. Employee directory; click a person to view/edit their
   full info (same layout as Add), delete from inside that view. Records are
   persisted via /api/people; their category tags feed the dispatch "Agent
   suggested" routing (see recommendCat in data.js). */

const { Button: PplButton } = window.FlowDesignSystem_96ad7f;

const CAT_LABELS = {
  hardware: "Hardware",
  performance: "Performance",
  safety: "Safety",
  mv: "Medium-voltage",
  grid: "Grid",
  monitoring: "Monitoring",
  capex: "Capex",
  finance: "Finance",
};
const CAT_KEYS = Object.keys(CAT_LABELS);

function initials(name) {
  return (name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}

function CatChip({ cat, active, onClick }) {
  const interactive = typeof onClick === "function";
  return React.createElement(interactive ? "button" : "span", {
    onClick,
    style: {
      display: "inline-flex", alignItems: "center", padding: "3px 9px", borderRadius: "var(--radius-pill)",
      fontSize: 11, fontWeight: 600, letterSpacing: "0.01em", cursor: interactive ? "pointer" : "default",
      border: "1px solid " + (active ? "var(--accent-primary)" : "var(--hairline)"),
      background: active ? "color-mix(in oklab, var(--accent-primary) 12%, white)" : "var(--surface-card)",
      color: active ? "var(--accent-primary)" : "var(--ink-secondary)",
      transition: "all var(--dur-fast) ease",
    },
  }, CAT_LABELS[cat] || cat);
}

function Avatar({ emp, size = 64 }) {
  if (emp.photo) {
    return React.createElement("img", {
      src: emp.photo, alt: emp.name,
      style: { width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--hairline)" },
    });
  }
  return React.createElement("span", {
    style: { width: size, height: size, borderRadius: "50%", display: "grid", placeItems: "center",
      background: "var(--surface-soft)", color: "var(--ink-secondary)", fontSize: size * 0.34, fontWeight: 700,
      border: "2px solid var(--hairline)" },
  }, initials(emp.name));
}

function PersonCard({ emp, onClick }) {
  return React.createElement("div", {
    onClick: () => onClick(emp),
    className: "recip-card",
    title: "View / edit " + emp.name,
    style: { display: "flex", flexDirection: "column", gap: 12, padding: "20px 18px", borderRadius: "var(--radius-xl)",
      border: "1px solid var(--hairline)", background: "var(--surface-card)", cursor: "pointer", transition: "all var(--dur-fast) ease" },
  },
    React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 14 } },
      React.createElement(Avatar, { emp, size: 60 }),
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 3, minWidth: 0 } },
        React.createElement("span", { style: { fontSize: 15.5, fontWeight: 600, color: "var(--ink-primary)", lineHeight: 1.2 } }, emp.name),
        React.createElement("span", { style: { fontSize: 12.5, color: "var(--ink-secondary)", lineHeight: 1.3 } }, emp.role),
        emp.department && React.createElement("span", { style: { fontSize: 11.5, color: "var(--ink-muted)" } }, emp.department))),
    emp.blurb && React.createElement("p", { style: { fontSize: 12.5, color: "var(--ink-muted)", lineHeight: 1.5, margin: 0 } }, emp.blurb),
    (emp.cats && emp.cats.length)
      ? React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 6 } },
          emp.cats.map((c) => React.createElement(CatChip, { key: c, cat: c, active: true })))
      : React.createElement("span", { style: { fontSize: 11.5, color: "var(--ink-muted)", fontStyle: "italic" } }, "No specialty assigned"),
    emp.email && React.createElement("span", { style: { fontSize: 11.5, color: "var(--ink-muted)", display: "inline-flex", alignItems: "center", gap: 6 } },
      React.createElement(Icon, { name: "mail", size: 13, color: "var(--ink-muted)" }), emp.email));
}

function Field({ label, children, hint }) {
  return React.createElement("label", { style: { display: "flex", flexDirection: "column", gap: 6 } },
    React.createElement("span", { style: { fontSize: 12, fontWeight: 600, color: "var(--ink-secondary)" } }, label),
    children,
    hint && React.createElement("span", { style: { fontSize: 11, color: "var(--ink-muted)" } }, hint));
}

const inputStyle = {
  width: "100%", padding: "9px 11px", borderRadius: "var(--radius-md)", border: "1px solid var(--hairline)",
  background: "var(--surface-card)", fontSize: 13.5, color: "var(--ink-primary)", fontFamily: "var(--font-body)", outline: "none",
};

// Dual-mode: person == null → add; person set → view / edit (with delete).
function PersonModal({ person, onClose, onSaved, onDelete, deleting }) {
  const editMode = !!person;
  const [name, setName] = useState(person ? person.name : "");
  const [role, setRole] = useState(person ? person.role : "");
  const [department, setDepartment] = useState(person ? (person.department || "") : "");
  const [blurb, setBlurb] = useState(person ? (person.blurb || "") : "");
  const [cats, setCats] = useState(person && person.cats ? person.cats.slice() : []);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(person ? (person.photo || "") : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const toggleCat = (c) => setCats((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
  const onFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    setError("");
    if (!name.trim() || !role.trim()) { setError("Name and role are required."); return; }
    if (!editMode && !file) { setError("Please upload a photo."); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("role", role.trim());
      fd.append("department", department.trim());
      fd.append("blurb", blurb.trim());
      fd.append("cats", cats.join(","));
      if (file) fd.append("photo", file);
      const url = editMode ? `/api/people/${encodeURIComponent(person.id)}` : "/api/people";
      const r = await fetch(url, { method: editMode ? "PUT" : "POST", body: fd });
      if (!r.ok) throw new Error(`${editMode ? "PUT" : "POST"} /api/people ${r.status}`);
      const rec = await r.json();
      await SOLAR.refreshPeople();
      onSaved(rec);
      onClose();
    } catch (err) {
      setError("Could not save: " + (err.message || err));
      setBusy(false);
    }
  };

  const photoLabel = file ? "Change photo" : (preview ? "Replace photo" : "Upload photo");
  const photoHint = file ? file.name : (preview ? "Current photo" : "PNG or JPG, square works best");
  const saveLabel = busy ? "Saving…" : (editMode ? "Save changes" : "Add person");

  return React.createElement("div", {
    onMouseDown: (e) => { if (e.target === e.currentTarget) onClose(); },
    style: { position: "fixed", inset: 0, zIndex: 1000, background: "rgba(20,20,20,.42)", backdropFilter: "blur(7px)",
      WebkitBackdropFilter: "blur(7px)", display: "grid", placeItems: "center", padding: "3vh 3vw" },
  },
    React.createElement("div", { className: "dispatch-card",
      style: { width: "min(680px, 94vw)", maxHeight: "90vh", background: "var(--surface-card)", borderRadius: "var(--radius-2xl)",
        boxShadow: "var(--shadow-overlay)", display: "flex", flexDirection: "column", overflow: "hidden" } },
      // header
      React.createElement("div", { style: { padding: "22px 26px 16px", borderBottom: "1px solid var(--hairline)", display: "flex", alignItems: "center", gap: 12 } },
        React.createElement("span", { style: { width: 36, height: 36, borderRadius: 10, background: "var(--accent-primary)", display: "grid", placeItems: "center" } },
          React.createElement(Icon, { name: "user", size: 19, color: "var(--on-accent)" })),
        React.createElement("div", { style: { display: "flex", flexDirection: "column" } },
          React.createElement("h2", { style: { fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 22, letterSpacing: "-0.01em", margin: 0, color: "var(--ink-primary)" } }, editMode ? "Edit person" : "Add a person"),
          React.createElement("span", { style: { fontSize: 12.5, color: "var(--ink-muted)" } }, "Specialty tags drive who the agent suggests for dispatch")),
        React.createElement("button", { onClick: onClose, title: "Close (Esc)",
          style: { marginLeft: "auto", width: 34, height: 34, borderRadius: "50%", border: "1px solid var(--hairline)", background: "var(--surface-card)", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--ink-secondary)" } },
          React.createElement(Icon, { name: "x", size: 17 }))),
      // body
      React.createElement("div", { style: { padding: "20px 26px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 } },
        React.createElement("div", { style: { display: "flex", gap: 18, alignItems: "center" } },
          React.createElement(Avatar, { emp: { name: name || "?", photo: preview }, size: 72 }),
          React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } },
            React.createElement("label", { className: "chip",
              style: { display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 13px", borderRadius: "var(--radius-md)", border: "1px solid var(--hairline)", background: "var(--surface-card)", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--ink-secondary)" } },
              React.createElement(Icon, { name: "eye", size: 15 }), photoLabel,
              React.createElement("input", { type: "file", accept: "image/*", onChange: onFile, style: { display: "none" } })),
            React.createElement("span", { style: { fontSize: 11, color: "var(--ink-muted)" } }, photoHint))),
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 } },
          React.createElement(Field, { label: "Full name" },
            React.createElement("input", { value: name, onChange: (e) => setName(e.target.value), placeholder: "e.g. Anna Becker", style: inputStyle })),
          React.createElement(Field, { label: "Role / title" },
            React.createElement("input", { value: role, onChange: (e) => setRole(e.target.value), placeholder: "e.g. Senior O&M Engineer", style: inputStyle }))),
        React.createElement(Field, { label: "Department", hint: "Optional" },
          React.createElement("input", { value: department, onChange: (e) => setDepartment(e.target.value), placeholder: "e.g. O&M / Field Operations", style: inputStyle })),
        React.createElement(Field, { label: "Specialty categories", hint: "Drives the agent's recommendation. The most specialized match (fewest tags) is suggested." },
          React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 8, paddingTop: 2 } },
            CAT_KEYS.map((c) => React.createElement(CatChip, { key: c, cat: c, active: cats.includes(c), onClick: () => toggleCat(c) })))),
        React.createElement(Field, { label: "Short blurb", hint: "Optional — shown on the person's card" },
          React.createElement("textarea", { value: blurb, onChange: (e) => setBlurb(e.target.value), rows: 2, placeholder: "What this person owns…",
            style: { ...inputStyle, resize: "vertical", lineHeight: 1.5 } })),
        editMode && person.email && React.createElement("span", { style: { fontSize: 11.5, color: "var(--ink-muted)", display: "inline-flex", alignItems: "center", gap: 6 } },
          React.createElement(Icon, { name: "mail", size: 13, color: "var(--ink-muted)" }), person.email),
        error && React.createElement("div", { style: { fontSize: 12.5, color: "var(--sev-critical)", fontWeight: 500 } }, error)),
      // footer — delete (edit only) on the left, cancel + save on the right
      React.createElement("div", { style: { padding: "16px 26px", borderTop: "1px solid var(--hairline)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 } },
        editMode
          ? React.createElement(PplButton, { variant: "secondary", onClick: deleting ? undefined : () => onDelete(person),
              iconLeft: React.createElement(Icon, { name: deleting ? "refresh" : "trash", size: 16, color: "var(--sev-critical)", style: deleting ? { animation: "spin .8s linear infinite" } : {} }) },
              deleting ? "Removing…" : "Delete")
          : React.createElement("span"),
        React.createElement("div", { style: { display: "flex", gap: 12 } },
          React.createElement(PplButton, { variant: "secondary", onClick: onClose }, "Cancel"),
          React.createElement(PplButton, { variant: "accent", onClick: busy ? undefined : submit,
            iconLeft: React.createElement(Icon, { name: busy ? "refresh" : "check", size: 16, color: "var(--on-accent)", style: busy ? { animation: "spin .8s linear infinite" } : {} }) },
            saveLabel)))));
}

function People() {
  const [list, setList] = useState(() => (SOLAR.employees || []).slice());
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const refreshList = () => setList((SOLAR.employees || []).slice());

  const removePerson = async (person) => {
    if (typeof window.confirm === "function" && !window.confirm(`Remove ${person.name} from the directory?`)) return;
    setDeleting(true);
    try {
      const r = await fetch(`/api/people/${encodeURIComponent(person.id)}`, { method: "DELETE" });
      if (!r.ok) throw new Error(`DELETE /api/people ${r.status}`);
      await SOLAR.refreshPeople();
      refreshList();
      setEditing(null);
    } catch (err) {
      console.warn("[SolarTwin] delete failed", err);
      if (typeof window.alert === "function") window.alert("Could not remove this person: " + (err.message || err));
    } finally {
      setDeleting(false);
    }
  };

  return React.createElement("div", { className: "tab-enter", style: { display: "flex", flexDirection: "column", gap: 20 } },
    React.createElement("div", { style: { display: "flex", alignItems: "flex-end", gap: 16 } },
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 4 } },
        React.createElement("h1", { style: { fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 27, letterSpacing: "-0.02em", margin: 0, color: "var(--ink-primary)" } }, "People"),
        React.createElement("span", { style: { fontSize: 13.5, color: "var(--ink-muted)" } }, list.length + " in the directory · click a person to view, edit or remove")),
      React.createElement("div", { style: { marginLeft: "auto" } },
        React.createElement(PplButton, { variant: "accent", onClick: () => setAdding(true),
          iconLeft: React.createElement(Icon, { name: "user", size: 16, color: "var(--on-accent)" }) }, "Add person"))),
    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 } },
      list.map((emp) => React.createElement(PersonCard, { key: emp.id, emp, onClick: setEditing }))),
    adding && React.createElement(PersonModal, {
      person: null,
      onClose: () => setAdding(false),
      onSaved: refreshList,
    }),
    editing && React.createElement(PersonModal, {
      person: editing,
      onClose: () => setEditing(null),
      onSaved: refreshList,
      onDelete: removePerson,
      deleting,
    }));
}

window.People = People;
