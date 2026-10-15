import { useState } from "react";
import api from "../api/api";
import { AuthContextProvider } from "./authContext";
import { getInitialAuthState } from "./authState";

function AuthContext({ children }) {
  const [{ user, isAuthenticated }, setAuthState] = useState(() =>
    getInitialAuthState(localStorage)
  );

  const login = (userData, authToken) => {
    if (!authToken) {
      throw new Error("Login response did not include an authentication token.");
    }

    localStorage.setItem("userData", JSON.stringify(userData));
    localStorage.setItem("authToken", authToken);
    setAuthState({ user: userData, isAuthenticated: true });
  };

  const setUser = (nextUser) => {
    setAuthState((currentState) => {
      const userData =
        typeof nextUser === "function" ? nextUser(currentState.user) : nextUser;
      return {
        user: userData,
        isAuthenticated: Boolean(
          userData && localStorage.getItem("authToken")
        ),
      };
    });
  };

  const logout = () => {
    const authToken = localStorage.getItem("authToken");
    localStorage.removeItem("userData");
    localStorage.removeItem("authToken");
    setAuthState({ user: null, isAuthenticated: false });

    if (authToken) {
      api
        .post(
          "/user/logout",
          {},
          { headers: { Authorization: `Bearer ${authToken}` } }
        )
        .catch((error) => {
          console.error("Server logout failed:", error);
        });
    }
  };

  return (
    <AuthContextProvider.Provider
      value={{ user, isAuthenticated, setUser, login, logout }}
    >
      {children}
    </AuthContextProvider.Provider>
  );
}

export default AuthContext;
