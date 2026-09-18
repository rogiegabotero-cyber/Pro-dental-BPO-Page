export const coerceValue = (field, value) => {
  if (field.type === "number") return Number(value || 0);
  if (field.type === "checkbox") return Boolean(value);
  if (field.type === "lines") {
    return String(value || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }
  if (field.type === "blocks") {
    return String(value || "")
      .split(/\n\s*\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return value || "";
};

export const fieldToInputValue = (field, value) => {
  if (field.type === "lines") return (value || []).join("\n");
  if (field.type === "blocks") return (value || []).join("\n\n");
  return value ?? "";
};
