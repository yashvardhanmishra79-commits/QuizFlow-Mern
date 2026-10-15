import { useState } from "react";
import api from "../api/api";
import { AuthContextProvider } from "./authContext";

function getInitialUser() {
  const storedUser = localStorage.getItem("userData");
  if (!storedUser) {
    return null;
  }

  try {
    const parsedUser = JSON.parse(storedUser);
    const safeUser = { ...parsedUser };
    delete safeUser.password;
    localStorage.setItem("userData", JSON.stringify(safeUser));
    return safeUser;
  } catch {
    localStorage.removeItem("userData");
    return null;
  }
}

function AuthContext({ children }) {
  const [user, setUser] = useState(getInitialUser);

  const login = (userData, authToken) => {
    if (!authToken) {
      throw new Error("Login response did not include an authentication token.");
    }

    localStorage.setItem("userData", JSON.stringify(userData));
    localStorage.setItem("authToken", authToken);
    setUser(userData);
  };

  const logout = () => {
    const authToken = localStorage.getItem("authToken");
    localStorage.removeItem("userData");
    localStorage.removeItem("authToken");
    setUser(null);

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
    <AuthContextProvider.Provider value={{ user, setUser, login, logout }}>
      {children}
    </AuthContextProvider.Provider>
  );
}

export default AuthContext;
