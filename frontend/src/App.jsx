import { useState, useEffect } from "react";
import Login from "./Login";
import Signup from "./Signup";
import Dashboard from "./Dashboard";
import { ThemeProvider } from "./ThemeContext";

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("login");
  const [hydrated, setHydrated] = useState(false);

  // Restore session on reload
  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
    }
    setHydrated(true);
  }, []);

  const handleLogin = (userData) => {
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setPage("login");
  };

  if (!hydrated) return null;

  return (
    <ThemeProvider>
      {user ? (
        <Dashboard
          user={user}
          onLogout={handleLogout}
          onUpdateUser={(updatedUser) => {
            localStorage.setItem("user", JSON.stringify(updatedUser));
            setUser(updatedUser);
          }}
        />
      ) : page === "signup" ? (
        <Signup onSwitch={() => setPage("login")} />
      ) : (
        <Login onLogin={handleLogin} onSwitch={() => setPage("signup")} />
      )}
    </ThemeProvider>
  );
}
