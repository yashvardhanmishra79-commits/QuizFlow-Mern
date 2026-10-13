import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/api";

const AuthContextProvider = createContext();

function AuthContext({ children }) {
  const [user, setUser] = useState(null);

  // Initialize user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("userData");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        const safeUser = { ...parsedUser };
        delete safeUser.password;
        setUser(safeUser);
        localStorage.setItem("userData", JSON.stringify(safeUser));
      } catch (e) {
        localStorage.removeItem("userData");
      }
    }
  }, []);

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

export function useUser() {
  const data = useContext(AuthContextProvider);
  return data;
}

export default AuthContext;
