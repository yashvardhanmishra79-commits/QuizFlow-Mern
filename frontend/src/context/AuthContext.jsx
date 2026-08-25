import { createContext, useContext, useState, useEffect } from "react";

const AuthContextProvider = createContext();

function AuthContext({ children }) {
  const [user, setUser] = useState(null);

  // Initialize user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("userData");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem("userData");
      }
    }
  }, []);

  const login = (userData) => {
    localStorage.setItem("userData", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("userData");
    setUser(null);
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
