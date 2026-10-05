import { MobileSettingsContext } from "../context/MobileSettingsContext";
import { useMobileSettings } from "../hooks/useMobileSettings";

export default function MobileSettingsProvider({ children }) {
  const mobile = useMobileSettings();
  return <MobileSettingsContext.Provider value={mobile}>{children}</MobileSettingsContext.Provider>;
}
