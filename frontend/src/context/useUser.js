import { useContext } from "react";
import { AuthContextProvider } from "./authContext";

export function useUser() {
  return useContext(AuthContextProvider);
}
