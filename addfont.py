#!/usr/bin/env python3

import os
import re
import shutil
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

WEIGHT_KEYWORDS = [
    ("extrabold", "ExtraBold"),
    ("semibold", "SemiBold"),
    ("regular", "Regular"),
    ("medium", "Medium"),
    ("bold", "Bold"),
]
WEIGHT_KEYWORDS.sort(key=lambda pair: -len(pair[0]))

LICENSE_NAMES = ["license", "licence", "ofl", "ffl", "copying"]

REPO_MARKERS = ["index.html", "js", "functions"]


def normalize(text):
    return re.sub(r"[^a-z0-9]", "", text.lower())


def classify_weight(filename):
    """Return (CanonicalName, is_italic, fingerprint) for a font filename,
    or (None, None, None). fingerprint is whatever's left of the name
    after the weight/italic are removed — used to tell genuine duplicate
    weights apart from a different style family that happens to share
    the same weight name (e.g. "_Roman-Bold" vs "_Cursive-Bold")."""
    base = os.path.splitext(filename)[0]
    norm = normalize(base)

    is_italic = "italic" in norm
    if is_italic:
        norm = norm.replace("italic", "")

    weight = None
    for keyword, canonical in WEIGHT_KEYWORDS:
        if keyword in norm:
            weight = canonical
            norm = norm.replace(keyword, "", 1)
            break

    if weight is None:
        if is_italic:
            weight = "Regular"
        else:
            return None, None, None

    return weight, is_italic, norm


def canonical_filename(weight, is_italic, ext):
    if is_italic:
        name = "Italic" if weight == "Regular" else f"{weight}Italic"
    else:
        name = weight
    return f"{name}.{ext}"


def common_prefix(strings):
    if not strings:
        return ""
    shortest = min(strings, key=len)
    for i in range(len(shortest), 0, -1):
        if all(s.startswith(shortest[:i]) for s in strings):
            return shortest[:i]
    return ""


def resolve_style_group(classified):
    """If the source folder mixes multiple style families that share
    weight names (e.g. a "_Roman" and a "_Cursive" set, both with their
    own Bold/Regular/etc.), ask which one to keep instead of silently
    merging them into one inconsistent font. Returns (kept, skipped)."""
    fingerprints = sorted(set(fp for _, _, _, _, fp in classified))
    if len(fingerprints) <= 1:
        return classified, []

    prefix = common_prefix(fingerprints)
    groups = {fp: [] for fp in fingerprints}
    for entry in classified:
        groups[entry[4]].append(entry)

    print("\nThis folder has more than one style family using the same weight names:")
    options = sorted(groups, key=lambda fp: -len(groups[fp]))
    for i, fp in enumerate(options, 1):
        label = fp[len(prefix):] or "(no extra suffix)"
        example = os.path.basename(groups[fp][0][3])
        print(f"  [{i}] {label:<14} e.g. {example}  ({len(groups[fp])} files)")

    while True:
        choice = ask(f"Which one do you want? [1-{len(options)}]: ")
        if choice.isdigit() and 1 <= int(choice) <= len(options):
            chosen_fp = options[int(choice) - 1]
            break
        print("Not a valid option.")

    kept = groups[chosen_fp]
    skipped = [e for fp, entries in groups.items() if fp != chosen_fp for e in entries]
    return kept, skipped


def find_font_files(source_dir):
    found = []
    for root, _dirs, files in os.walk(source_dir):
        for f in files:
            ext = os.path.splitext(f)[1].lower().lstrip(".")
            if ext in ("ttf", "otf"):
                found.append((os.path.join(root, f), ext))
    return found


def find_license_file(source_dir):
    candidates = []
    for root, _dirs, files in os.walk(source_dir):
        for f in files:
            base = normalize(os.path.splitext(f)[0])
            if base in LICENSE_NAMES:
                priority = LICENSE_NAMES.index(base)
                candidates.append((priority, os.path.join(root, f)))
    if not candidates:
        return None
    candidates.sort(key=lambda c: c[0])
    return candidates[0][1]


def build_plan(source_dir):
    """Returns (plan, unmatched, skipped_duplicates, skipped_other_style)
    where plan maps canonical filename -> source filepath."""
    files = find_font_files(source_dir)

    classified = []
    unmatched = []
    for filepath, ext in files:
        weight, is_italic, fingerprint = classify_weight(os.path.basename(filepath))
        if weight is None:
            unmatched.append(filepath)
            continue
        classified.append((weight, is_italic, ext, filepath, fingerprint))

    classified, skipped_other_style = resolve_style_group(classified)

    chosen = {}
    skipped_duplicates = []
    
    for ext_priority in ("ttf", "otf"):
        for weight, is_italic, ext, filepath, _fp in classified:
            if ext != ext_priority:
                continue
            key = (weight, is_italic)
            if key in chosen:
                skipped_duplicates.append((canonical_filename(weight, is_italic, ext), filepath))
                continue
            chosen[key] = (ext, filepath)

    plan = {}
    for (weight, is_italic), (ext, filepath) in chosen.items():
        plan[canonical_filename(weight, is_italic, ext)] = filepath

    return plan, unmatched, skipped_duplicates, skipped_other_style


def print_plan(font_name, plan, license_src, unmatched, skipped_duplicates, skipped_other_style):
    print(f"\n{font_name}/")
    entries = sorted(plan.items())
    for canonical, src in entries:
        print(f"├── {canonical:<18} (from: {os.path.basename(src)})")
    if license_src:
        print(f"└── LICENSE.txt        (from: {os.path.basename(license_src)})")
    else:
        print("└── (no license file found — add one manually if you have it)")

    if skipped_other_style:
        print("\nExcluded — different style family than the one you picked:")
        for _w, _i, _e, src, _fp in skipped_other_style:
            print(f"  - {os.path.basename(src)}")

    if skipped_duplicates:
        print("\nSkipped duplicates (a .ttf already covers these):")
        for canonical, src in skipped_duplicates:
            print(f"  - {os.path.basename(src)}  (would have been {canonical})")

    if unmatched:
        print("\nCouldn't tell what weight these are — not included, check manually:")
        for f in unmatched:
            print(f"  - {os.path.basename(f)}")


def ask(prompt):
    return input(prompt).strip()


def confirm(prompt):
    return ask(prompt).lower() == "y"


def in_repo_root():
    return all(os.path.exists(os.path.join(SCRIPT_DIR, marker)) for marker in REPO_MARKERS)


def ask_source_dir():
    while True:
        path = ask("Source folder (the font's files are somewhere inside this): ")
        if not path:
            print("Can't be empty.")
            continue
        path = os.path.expanduser(path)
        if not os.path.isdir(path):
            print(f"Not a folder: {path}")
            continue
        return path


def main():
    if not in_repo_root():
        print(
            "addfont.py needs to live in the dcfont repo root, next to "
            f"{', '.join(REPO_MARKERS)}. It looks like it's been moved "
            "or copied somewhere else on its own."
        )
        sys.exit(1)

    source_dir = ask_source_dir()

    raw_name = ask("Font Name: ")
    font_name = raw_name.replace(" ", "")
    if font_name != raw_name:
        print(f"(removed spaces — using \"{font_name}\")")
    if not font_name:
        print("Font name can't be empty.")
        sys.exit(1)

    plan, unmatched, skipped_duplicates, skipped_other_style = build_plan(source_dir)
    license_src = find_license_file(source_dir)

    if not plan:
        print("No .ttf or .otf files could be matched to a weight in that folder. Nothing to do.")
        sys.exit(1)

    print_plan(font_name, plan, license_src, unmatched, skipped_duplicates, skipped_other_style)

    if not confirm("\nCreate this folder? [y/N]: "):
        print("Cancelled — nothing was created.")
        sys.exit(0)

    dest_dir = os.path.join(SCRIPT_DIR, font_name)
    if os.path.exists(dest_dir):
        print(f"\n{dest_dir}/ already exists — aborting so nothing gets overwritten.")
        sys.exit(1)

    os.makedirs(dest_dir)
    for canonical, src in plan.items():
        shutil.copy2(src, os.path.join(dest_dir, canonical))
    if license_src:
        shutil.copy2(license_src, os.path.join(dest_dir, "LICENSE.txt"))

    print(f"\nCreated {dest_dir}/ with {len(plan)} font file(s).")

    if confirm("Move it into fonts/? [y/N]: "):
        fonts_dir = os.path.join(SCRIPT_DIR, "fonts")
        os.makedirs(fonts_dir, exist_ok=True)
        target = os.path.join(fonts_dir, font_name)
        if os.path.exists(target):
            print(f"{target}/ already exists — left {dest_dir}/ where it is instead.")
        else:
            shutil.move(dest_dir, target)
            print(f"Moved to {target}/")
    else:
        print(f"Left it at {dest_dir}/ — move it into fonts/ yourself whenever you're ready.")


if __name__ == "__main__":
    main()
