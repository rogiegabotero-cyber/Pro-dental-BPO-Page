import { useEffect, useState } from "react";
import { FaSlidersH } from "react-icons/fa";
import { fontOptions } from "../data/fontOptions";
import { DEFAULT_TAB_ICONS, NAV_ICONS, resolveNavIcon } from "../utils/navIcons";

// Header-only appearance settings, stored on the navbar style bucket
// (styles.navbar) next to its background, font and spacing.
function NumberField({ label, value, onCommit, placeholder }) {
  const [draft, setDraft] = useState(value ?? "");

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  const commit = () => {
    if (draft === (value ?? "")) return;
    onCommit(draft === "" ? "" : String(Math.max(0, parseInt(draft, 10) || 0)));
  };

  return (
    <label className="layout-editor-spacing-field">
      <span>{label}</span>
      <input
        type="number"
        min="0"
        step="1"
        value={draft}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <div className="layout-editor-navcolor">
      <span>{label}</span>
      <div>
        <input
          type="color"
          value={value || "#ffffff"}
          onChange={(event) => onChange(event.target.value)}
          aria-label={label}
        />
        {value && (
          <button type="button" onClick={() => onChange("")} title="Back to the default color">
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

const WEIGHT_OPTIONS = [
  { label: "Default", value: "" },
  { label: "Regular", value: "400" },
  { label: "Medium", value: "500" },
  { label: "Semi-bold", value: "600" },
  { label: "Bold", value: "700" },
];

function TabBarSettings({ value, navLinks, onChange }) {
  const set = (key) => (next) => onChange({ [key]: next });
  const icons = value.tabIcons || {};

  const setIcon = (linkId, iconKey) => {
    const next = { ...icons };
    if (iconKey) {
      next[linkId] = iconKey;
    } else {
      delete next[linkId];
    }
    onChange({ tabIcons: next });
  };

  return (
    <div className="layout-editor-panel-section">
      <span className="layout-editor-panel-section__label">
        <FaSlidersH /> Bottom tab bar
      </span>
      <p className="layout-editor-sidepanel__hint">
        Used when the phone menu is set to Bottom tab bar (Mobile tab).
      </p>

      <span className="layout-editor-ribbon__caption">Icons</span>
      {navLinks.map((link) => {
        const Icon = resolveNavIcon(link.id, icons[link.id]);
        return (
          <label key={link.id} className="layout-editor-navicon">
            <span className="layout-editor-navicon__preview">
              <Icon aria-hidden="true" />
            </span>
            <span className="layout-editor-navicon__name">{link.label}</span>
            <select
              value={icons[link.id] || ""}
              onChange={(event) => setIcon(link.id, event.target.value)}
              aria-label={`Icon for ${link.label}`}
            >
              <option value="">
                Default ({NAV_ICONS[DEFAULT_TAB_ICONS[link.id] || "link"].label})
              </option>
              {Object.entries(NAV_ICONS).map(([key, icon]) => (
                <option key={key} value={key}>
                  {icon.label}
                </option>
              ))}
            </select>
          </label>
        );
      })}

      <span className="layout-editor-ribbon__caption">Label text</span>
      <select
        className="layout-editor-navselect"
        value={value.tabFontFamily || ""}
        onChange={(event) => set("tabFontFamily")(event.target.value)}
        aria-label="Tab label font"
      >
        {fontOptions.map((option) => (
          <option key={option.label} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <div className="layout-editor-spacing-grid">
        <NumberField
          label="Font size"
          placeholder="10"
          value={value.tabFontSize}
          onCommit={set("tabFontSize")}
        />
        <NumberField
          label="Icon size"
          placeholder="18"
          value={value.tabIconSize}
          onCommit={set("tabIconSize")}
        />
      </div>
      <select
        className="layout-editor-navselect"
        value={value.tabFontWeight || ""}
        onChange={(event) => set("tabFontWeight")(event.target.value)}
        aria-label="Tab label weight"
      >
        {WEIGHT_OPTIONS.map((option) => (
          <option key={option.label} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <span className="layout-editor-ribbon__caption">Colors</span>
      <ColorField label="Label text" value={value.tabTextColor} onChange={set("tabTextColor")} />
      <ColorField label="Icons" value={value.tabIconColor} onChange={set("tabIconColor")} />
      <ColorField
        label="Selected tab"
        value={value.tabActiveColor}
        onChange={set("tabActiveColor")}
      />
      <ColorField label="Bar background" value={value.mobileBarBg} onChange={set("mobileBarBg")} />

      <button
        type="button"
        className="layout-editor-popover__reset"
        onClick={() =>
          onChange({
            tabIcons: {},
            tabFontFamily: "",
            tabFontSize: "",
            tabFontWeight: "",
            tabIconSize: "",
            tabTextColor: "",
            tabIconColor: "",
            tabActiveColor: "",
            mobileBarBg: "",
          })
        }
      >
        Reset tab bar
      </button>
    </div>
  );
}

export default function NavbarSettings({ value, onChange, navLinks = [] }) {
  const set = (key) => (next) => onChange({ [key]: next });

  return (
    <div className="layout-editor-panel-section">
      <span className="layout-editor-panel-section__label">
        <FaSlidersH /> Header appearance
      </span>

      <span className="layout-editor-ribbon__caption">Size (px)</span>
      <div className="layout-editor-spacing-grid">
        <NumberField
          label="Bar padding"
          placeholder="16"
          value={value.navPaddingY}
          onCommit={set("navPaddingY")}
        />
        <NumberField
          label="Logo icon"
          placeholder="80"
          value={value.logoIconWidth}
          onCommit={set("logoIconWidth")}
        />
        <NumberField
          label="Logo name"
          placeholder="240"
          value={value.logoTextWidth}
          onCommit={set("logoTextWidth")}
        />
        <NumberField
          label="Link text"
          placeholder="16"
          value={value.linkFontSize}
          onCommit={set("linkFontSize")}
        />
        <NumberField
          label="Icon size"
          placeholder="18"
          value={value.iconSize}
          onCommit={set("iconSize")}
        />
      </div>

      <span className="layout-editor-ribbon__caption">Colors</span>
      <ColorField label="Link text" value={value.linkColor} onChange={set("linkColor")} />
      <ColorField
        label="Active link"
        value={value.linkActiveColor}
        onChange={set("linkActiveColor")}
      />
      <ColorField label="Icons (menu, tabs, arrow)" value={value.iconColor} onChange={set("iconColor")} />
      <ColorField
        label="Menu button"
        value={value.menuButtonBg}
        onChange={set("menuButtonBg")}
      />
      <ColorField
        label="Consultation button"
        value={value.buttonBg}
        onChange={set("buttonBg")}
      />
      <ColorField
        label="Consultation button text"
        value={value.buttonText}
        onChange={set("buttonText")}
      />

      <button
        type="button"
        className="layout-editor-popover__reset"
        onClick={() =>
          onChange({
            navPaddingY: "",
            logoIconWidth: "",
            logoTextWidth: "",
            linkFontSize: "",
            iconSize: "",
            linkColor: "",
            linkActiveColor: "",
            iconColor: "",
            menuButtonBg: "",
            buttonBg: "",
            buttonText: "",
          })
        }
      >
        Reset header appearance
      </button>

      <TabBarSettings value={value} navLinks={navLinks} onChange={onChange} />
    </div>
  );
}
