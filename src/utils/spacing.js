export const SPACING_KEYS = [
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
];

export function emptySpacing() {
  return SPACING_KEYS.reduce((acc, key) => {
    acc[key] = "";
    return acc;
  }, {});
}

export function buildSpacingStyle(raw) {
  const style = {};
  SPACING_KEYS.forEach((key) => {
    if (raw?.[key] !== undefined && raw[key] !== "") {
      style[key] = `${raw[key]}px`;
    }
  });
  return style;
}
