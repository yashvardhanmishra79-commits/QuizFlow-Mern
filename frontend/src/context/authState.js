export function readStoredUser(storage) {
  const storedUser = storage.getItem("userData");
  if (!storedUser) {
    return null;
  }

  try {
    const parsedUser = JSON.parse(storedUser);
    if (!parsedUser || typeof parsedUser !== "object" || Array.isArray(parsedUser)) {
      throw new Error("Stored user data must be an object.");
    }

    const safeUser = { ...parsedUser };
    delete safeUser.password;
    storage.setItem("userData", JSON.stringify(safeUser));
    return safeUser;
  } catch {
    storage.removeItem("userData");
    return null;
  }
}

export function getInitialAuthState(storage) {
  const user = readStoredUser(storage);
  return {
    user,
    isAuthenticated: Boolean(user && storage.getItem("authToken")),
  };
}

export function getRouteAccess({ user, isAuthenticated, requiredRole }) {
  if (!requiredRole) {
    return { allowed: true, redirectTo: null };
  }
  if (!isAuthenticated || !user) {
    return { allowed: false, redirectTo: "/login" };
  }
  if (user.role === requiredRole) {
    return { allowed: true, redirectTo: null };
  }
  if (user.role === "admin") {
    return { allowed: false, redirectTo: "/admin" };
  }
  if (user.role === "student") {
    return { allowed: false, redirectTo: "/quizzes" };
  }
  return { allowed: false, redirectTo: "/" };
}
