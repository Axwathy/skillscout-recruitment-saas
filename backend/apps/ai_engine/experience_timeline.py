"""Experience timeline computation with overlap detection and recency decay.

Pure functions — no Django imports.  Takes parsed resume ``experience[]``
dicts and returns structured timeline data that the ranking engine can use
to produce more accurate experience scores.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date
from typing import Any

# ---------------------------------------------------------------------------
# Public data classes
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class DateRange:
    """An inclusive [start, end) month range."""
    start: date  # first day of month
    end: date    # first day of the month AFTER the last month


@dataclass
class TimelineResult:
    """Result of computing an experience timeline."""
    total_months: int = 0
    merged_ranges: list[DateRange] = field(default_factory=list)
    skill_months: dict[str, float] = field(default_factory=dict)
    role_trajectory: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Recency decay configuration
# ---------------------------------------------------------------------------

# How much a skill's months are discounted based on when they were last used.
# Skills used within the last 2 years get full weight; 2–4 years ago get 0.7;
# older than 4 years get 0.4.
DECAY_BANDS: list[tuple[int, float]] = [
    (24, 1.0),   # 0–24 months ago  → full weight
    (48, 0.7),   # 25–48 months ago → 70%
]
DECAY_FLOOR = 0.4  # anything older


# ---------------------------------------------------------------------------
# Main entry points
# ---------------------------------------------------------------------------

def compute_experience_timeline(
    experience_items: list[dict[str, Any]],
    *,
    reference_date: date | None = None,
) -> TimelineResult:
    """Build a merged timeline from experience entries.

    Parameters
    ----------
    experience_items:
        List of dicts with at least ``start_date`` and ``end_date`` keys
        (format ``"YYYY-MM"`` or ``"present"``).
    reference_date:
        Used to resolve ``"present"`` and to compute recency decay.
        Defaults to today.

    Returns
    -------
    TimelineResult with total non-overlapping months, merged ranges,
    per-skill recency-weighted months, and a role trajectory.
    """
    ref = reference_date or date.today()
    ranges: list[DateRange] = []
    roles: list[tuple[date, str]] = []
    skill_ranges: dict[str, list[DateRange]] = {}

    for item in experience_items:
        if not isinstance(item, dict):
            continue
        dr = _parse_date_range(item, ref)
        if dr is None:
            continue
        ranges.append(dr)

        role = str(item.get("role") or item.get("title") or "").strip()
        if role:
            roles.append((dr.start, role))

        # Collect skills mentioned in this experience entry
        entry_skills = _extract_entry_skills(item)
        for skill in entry_skills:
            skill_ranges.setdefault(skill, []).append(dr)

    merged = merge_date_ranges(ranges)
    total_months = sum(_months_in_range(r) for r in merged)

    # Per-skill months with recency decay
    skill_months: dict[str, float] = {}
    for skill, sranges in skill_ranges.items():
        merged_skill = merge_date_ranges(sranges)
        raw_months = sum(_months_in_range(r) for r in merged_skill)
        decay = _recency_factor(merged_skill, ref)
        skill_months[skill] = round(raw_months * decay, 1)

    # Role trajectory sorted chronologically
    roles.sort(key=lambda pair: pair[0])
    trajectory = _dedupe_trajectory([role for _, role in roles])

    return TimelineResult(
        total_months=total_months,
        merged_ranges=merged,
        skill_months=skill_months,
        role_trajectory=trajectory,
    )


def compute_skill_experience_summary(
    experience_items: list[dict[str, Any]],
    *,
    reference_date: date | None = None,
    top_n: int = 10,
) -> list[tuple[str, float, str]]:
    """Return the top-N skills with their weighted years and recency label.

    Returns a list of ``(skill_name, weighted_years, recency_label)`` tuples
    sorted by weighted years descending.

    ``recency_label`` is one of ``"recent"``, ``"moderate"``, ``"dated"``.
    """
    ref = reference_date or date.today()
    result = compute_experience_timeline(experience_items, reference_date=ref)

    entries: list[tuple[str, float, str]] = []
    for skill, weighted_months in result.skill_months.items():
        years = round(weighted_months / 12, 1)
        if years <= 0:
            continue
        # Determine recency label from the raw ranges
        label = "recent"
        if weighted_months < _raw_skill_months(skill, experience_items, ref) * 0.75:
            label = "moderate"
        if weighted_months < _raw_skill_months(skill, experience_items, ref) * 0.5:
            label = "dated"
        entries.append((skill, years, label))

    entries.sort(key=lambda e: e[1], reverse=True)
    return entries[:top_n]


# ---------------------------------------------------------------------------
# Date range merging
# ---------------------------------------------------------------------------

def merge_date_ranges(ranges: list[DateRange]) -> list[DateRange]:
    """Merge overlapping/adjacent date ranges so time is not double-counted."""
    if not ranges:
        return []

    sorted_ranges = sorted(ranges, key=lambda r: r.start)
    merged: list[DateRange] = [sorted_ranges[0]]

    for current in sorted_ranges[1:]:
        last = merged[-1]
        if current.start <= last.end:
            # Overlapping or adjacent — extend
            if current.end > last.end:
                merged[-1] = DateRange(start=last.start, end=current.end)
        else:
            merged.append(current)

    return merged


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

_YYYY_MM_RE = re.compile(r"^(\d{4})-(\d{2})$")


def _parse_date_range(item: dict[str, Any], ref: date) -> DateRange | None:
    """Parse start_date/end_date from an experience dict into a DateRange."""
    start_raw = str(item.get("start_date") or "").strip()
    end_raw = str(item.get("end_date") or "").strip()

    start = _parse_month(start_raw)
    if start is None:
        return None

    if end_raw.lower() in ("present", "current", "now", "ongoing", ""):
        end = date(ref.year, ref.month, 1)
    else:
        end = _parse_month(end_raw)
        if end is None:
            end = date(ref.year, ref.month, 1)

    # Advance end by one month to make range exclusive
    end = _advance_month(end)

    if end <= start:
        return None

    return DateRange(start=start, end=end)


def _parse_month(value: str) -> date | None:
    match = _YYYY_MM_RE.match(value)
    if not match:
        return None
    year, month = int(match.group(1)), int(match.group(2))
    if not (1 <= month <= 12 and 1900 <= year <= 2100):
        return None
    return date(year, month, 1)


def _advance_month(d: date) -> date:
    if d.month == 12:
        return date(d.year + 1, 1, 1)
    return date(d.year, d.month + 1, 1)


def _months_in_range(dr: DateRange) -> int:
    return (dr.end.year - dr.start.year) * 12 + (dr.end.month - dr.start.month)


def _recency_factor(merged_ranges: list[DateRange], ref: date) -> float:
    """Compute a single recency decay factor for a set of date ranges.

    Based on the most recent endpoint in the ranges.
    """
    if not merged_ranges:
        return DECAY_FLOOR

    most_recent_end = max(r.end for r in merged_ranges)
    months_ago = (ref.year - most_recent_end.year) * 12 + (ref.month - most_recent_end.month)

    for threshold_months, factor in DECAY_BANDS:
        if months_ago <= threshold_months:
            return factor

    return DECAY_FLOOR


def _extract_entry_skills(item: dict[str, Any]) -> list[str]:
    """Extract skill names mentioned in an experience entry's text fields."""
    skills: list[str] = []

    # If the entry has explicit skills_used field
    for skill in _as_list(item.get("skills_used")):
        if isinstance(skill, str) and skill.strip():
            skills.append(skill.strip())

    # Also scan achievements and description for technology mentions
    # (We keep this lightweight — the full skill inference is done by
    # the parser; here we just capture what's explicitly attributed
    # to this specific job)
    if not skills:
        # Fall back: look at technologies field (common in projects)
        for tech in _as_list(item.get("technologies")):
            if isinstance(tech, str) and tech.strip():
                skills.append(tech.strip())

    return skills


def _dedupe_trajectory(roles: list[str]) -> list[str]:
    """Remove consecutive duplicates from a role trajectory."""
    deduped: list[str] = []
    for role in roles:
        if not deduped or role.lower() != deduped[-1].lower():
            deduped.append(role)
    return deduped


def _raw_skill_months(
    skill: str,
    experience_items: list[dict[str, Any]],
    ref: date,
) -> float:
    """Compute raw (undecayed) months for a skill."""
    ranges: list[DateRange] = []
    for item in experience_items:
        if not isinstance(item, dict):
            continue
        entry_skills = [s.lower() for s in _extract_entry_skills(item)]
        if skill.lower() in entry_skills:
            dr = _parse_date_range(item, ref)
            if dr:
                ranges.append(dr)
    merged = merge_date_ranges(ranges)
    return float(sum(_months_in_range(r) for r in merged))


def _as_list(value: Any) -> list[Any]:
    if isinstance(value, list):
        return value
    if value:
        return [value]
    return []
