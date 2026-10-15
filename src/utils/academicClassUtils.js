/**
 * Utility functions for unifying and grouping academic classes
 * (e.g. grouping Class 9 Science, Commerce, Arts into a single Unified Class 9)
 */

export function getDepartmentLabel(groupName) {
  if (!groupName) return "সাধারণ";
  const lower = groupName.toLowerCase().trim();
  if (lower === "science" || lower === "বিজ্ঞান") return "বিজ্ঞান (Science)";
  if (lower === "commerce" || lower === "বাণিজ্য" || lower === "ব্যবসায় শিক্ষা" || lower === "ব্যবসায় শিক্ষা") return "ব্যবসায় শিক্ষা (Commerce)";
  if (lower === "arts" || lower === "মানবিক") return "মানবিক (Arts)";
  return groupName;
}

export function getDepartmentShortLabel(groupName) {
  if (!groupName) return "সাধারণ";
  const lower = groupName.toLowerCase().trim();
  if (lower === "science" || lower === "বিজ্ঞান") return "বিজ্ঞান";
  if (lower === "commerce" || lower === "বাণিজ্য" || lower === "ব্যবসায় শিক্ষা" || lower === "ব্যবসায় শিক্ষা") return "ব্যবসায় শিক্ষা";
  if (lower === "arts" || lower === "মানবিক") return "মানবিক";
  return groupName;
}

export function groupAcademicClasses(rawClasses) {
  if (!rawClasses || !Array.isArray(rawClasses) || rawClasses.length === 0) {
    return [];
  }

  const map = new Map();

  rawClasses.forEach((c) => {
    const classNameClean = (c.class_name || "").trim();
    const sectionClean = (c.section_name || "").trim();
    const yearClean = (c.session_year || "").trim();

    // Grouping key: identical class name, section, and session year
    const key = `${classNameClean}___${sectionClean}___${yearClean}`;

    if (!map.has(key)) {
      let displayName = classNameClean;
      if (sectionClean) {
        displayName += ` [শাখা: ${sectionClean}]`;
      }
      if (yearClean) {
        displayName += ` - সেশন: ${yearClean}`;
      }

      map.set(key, {
        key,
        class_name: c.class_name,
        section_name: c.section_name,
        session_year: c.session_year,
        displayName: displayName.trim(),
        variants: [],
        hasGroups: false,
        groups: []
      });
    }

    const entry = map.get(key);
    entry.variants.push(c);

    if (c.group_name && c.group_name.trim() !== "") {
      entry.hasGroups = true;
      if (!entry.groups.includes(c.group_name)) {
        entry.groups.push(c.group_name);
      }
    }
  });

  return Array.from(map.values());
}
