"""People / employee directory for the dispatch UI.

The directory is persisted as JSON next to the photos in
`test 2/project/assets/people/people.json` so the frontend can serve both the
records and the images from the same static mount. On first access the file is
seeded from the original hardcoded employee list that used to live in
`test 2/project/data.js`.

Each record:
    id          - slug (also used for uploaded photo filename)
    name        - full name
    role        - free-text job title
    department  - team / department
    cats        - list of category tags (drives dispatch recommendation)
    photo       - path relative to the frontend root (assets/people/...)
    blurb       - one-line specialty description
    email       - contact address (synthetic if not supplied)
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from backend.agents.contacts import _synthetic_email

# test 2/project/assets/people/
PEOPLE_DIR = Path(__file__).resolve().parents[2] / "test 2" / "project" / "assets" / "people"
PEOPLE_JSON = PEOPLE_DIR / "people.json"

# Allowed specialty categories (must match the frontend taxonomy).
CATEGORIES = ["hardware", "performance", "safety", "mv", "grid", "monitoring", "capex", "finance"]

# Seed directory — copied from the original EMPLOYEES array in data.js.
_SEED: list[dict[str, Any]] = [
    {"id": "raphael",  "name": "Raphael May",      "role": "Senior O&M Engineer",              "department": "O&M / Field Operations", "cats": ["hardware"],    "photo": "assets/people/raphael-may.png",      "blurb": "Owns inverter hardware faults — IGBT, fans, thermal."},
    {"id": "sonja",    "name": "Sonja Körner",     "role": "Senior O&M Engineer",              "department": "O&M / Field Operations", "cats": ["performance"], "photo": "assets/people/sonja-koerner.png",    "blurb": "String & MPPT performance, soiling, clipping."},
    {"id": "frederik", "name": "Frederik Kliemt",  "role": "Senior O&M Engineer",              "department": "O&M / Field Operations", "cats": ["safety"],      "photo": "assets/people/frederik-kliemt.png",  "blurb": "Electrical safety — arc faults, insulation, isolation."},
    {"id": "felix",    "name": "Felix Harder",     "role": "Ingenieur Mittelspannungsplanung", "department": "Grid / Network",         "cats": ["mv"],          "photo": "assets/people/felix-harder.png",     "blurb": "Medium-voltage: transformers, reactive power."},
    {"id": "vanessa",  "name": "Vanessa Schöll",   "role": "Teamleader Grid Connection Mgmt",  "department": "Grid / Network",         "cats": ["grid"],        "photo": "assets/people/vanessa-schoell.png",  "blurb": "Grid export, curtailment, DSO coordination."},
    {"id": "dimitar",  "name": "Dimitar Gendov",   "role": "Senior Project Engineer",          "department": "Engineering",            "cats": ["capex"],       "photo": "assets/people/dimitar-gendov.png",   "blurb": "Replace-verdict reviews & component capex."},
    {"id": "malte",    "name": "Malte Sombrutzki", "role": "1st Level Support Lead",            "department": "Plant Monitoring / SCADA", "cats": ["monitoring"],  "photo": "assets/people/malte-sombrutzki.png", "blurb": "Comms dropouts, monitoring, first response."},
    {"id": "cayen",    "name": "Cayen Kröger",     "role": "Projektcontrollerin",              "department": "Finance / Commercial",   "cats": ["finance"],     "photo": "assets/people/cayen-kroeger.png",    "blurb": "Financial sign-off on high-€ loss events."},
]


def _slugify(value: str) -> str:
    out = (
        value.lower()
        .replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
    )
    out = re.sub(r"[^a-z0-9]+", "-", out).strip("-")
    return out or "person"


def load_people() -> list[dict[str, Any]]:
    """Return the directory, seeding the JSON file on first access."""
    if PEOPLE_JSON.exists():
        try:
            with PEOPLE_JSON.open("r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, list):
                return data
        except (json.JSONDecodeError, OSError):
            pass
    _save(_SEED)
    return list(_SEED)


def _save(people: list[dict[str, Any]]) -> None:
    PEOPLE_DIR.mkdir(parents=True, exist_ok=True)
    with PEOPLE_JSON.open("w", encoding="utf-8") as f:
        json.dump(people, f, ensure_ascii=False, indent=2)


def _unique_id(base: str, existing: set[str]) -> str:
    if base not in existing:
        return base
    i = 2
    while f"{base}-{i}" in existing:
        i += 1
    return f"{base}-{i}"


def _write_photo(pid: str, photo_bytes: bytes, photo_filename: str | None) -> str:
    """Persist photo bytes under the people assets dir; return the relative path."""
    ext = ".png"
    if photo_filename and "." in photo_filename:
        candidate = "." + photo_filename.rsplit(".", 1)[-1].lower()
        if candidate in (".png", ".jpg", ".jpeg", ".webp", ".gif"):
            ext = candidate
    PEOPLE_DIR.mkdir(parents=True, exist_ok=True)
    (PEOPLE_DIR / f"{pid}{ext}").write_bytes(photo_bytes)
    return f"assets/people/{pid}{ext}"


def _remove_photo_file(photo: str) -> None:
    photo = (photo or "").strip()
    if not photo.startswith("assets/people/"):
        return
    path = PEOPLE_DIR / Path(photo).name
    try:
        if path.resolve().parent == PEOPLE_DIR.resolve() and path.exists():
            path.unlink()
    except OSError:
        pass


def add_person(
    *,
    name: str,
    role: str,
    department: str = "",
    cats: list[str] | None = None,
    blurb: str = "",
    email: str | None = None,
    photo_bytes: bytes | None = None,
    photo_filename: str | None = None,
) -> dict[str, Any]:
    """Persist a new person (and optional uploaded photo) and return the record."""
    name = (name or "").strip()
    role = (role or "").strip()
    if not name or not role:
        raise ValueError("name and role are required")

    people = load_people()
    existing_ids = {p.get("id", "") for p in people}
    pid = _unique_id(_slugify(name), existing_ids)

    cats = [c for c in (cats or []) if c in CATEGORIES]

    photo = _write_photo(pid, photo_bytes, photo_filename) if photo_bytes else ""

    record = {
        "id": pid,
        "name": name,
        "role": role,
        "department": (department or "").strip(),
        "cats": cats,
        "photo": photo,
        "blurb": (blurb or "").strip(),
        "email": (email or "").strip() or _synthetic_email(name),
    }
    people.append(record)
    _save(people)
    return record


def update_person(
    person_id: str,
    *,
    name: str | None = None,
    role: str | None = None,
    department: str | None = None,
    cats: list[str] | None = None,
    blurb: str | None = None,
    email: str | None = None,
    photo_bytes: bytes | None = None,
    photo_filename: str | None = None,
) -> dict[str, Any]:
    """Update an existing person in place. Raises KeyError if id is unknown."""
    people = load_people()
    idx = next((i for i, p in enumerate(people) if p.get("id") == person_id), None)
    if idx is None:
        raise KeyError(person_id)

    rec = dict(people[idx])
    if name is not None and name.strip():
        rec["name"] = name.strip()
    if role is not None and role.strip():
        rec["role"] = role.strip()
    if department is not None:
        rec["department"] = department.strip()
    if blurb is not None:
        rec["blurb"] = blurb.strip()
    if email is not None and email.strip():
        rec["email"] = email.strip()
    if cats is not None:
        rec["cats"] = [c for c in cats if c in CATEGORIES]
    if not rec.get("name") or not rec.get("role"):
        raise ValueError("name and role are required")

    if photo_bytes:
        new_photo = _write_photo(person_id, photo_bytes, photo_filename)
        old_photo = rec.get("photo", "")
        if old_photo and Path(old_photo).name != Path(new_photo).name:
            _remove_photo_file(old_photo)
        rec["photo"] = new_photo

    people[idx] = rec
    _save(people)
    return rec


def delete_person(person_id: str) -> bool:
    """Remove a person by id (and their uploaded photo). Returns True if removed."""
    people = load_people()
    remaining = [p for p in people if p.get("id") != person_id]
    if len(remaining) == len(people):
        return False

    removed = next((p for p in people if p.get("id") == person_id), None)
    if removed:
        _remove_photo_file(removed.get("photo", ""))

    _save(remaining)
    return True
