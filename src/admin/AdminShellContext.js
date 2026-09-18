import { createContext, useContext } from "react";

export const AdminShellContext = createContext(null);

export function useAdminShell() {
  return useContext(AdminShellContext);
}
