import axios from "axios";
import { MOCK_USERS } from "../data/mockAccounts";
import { getEffectivePassword } from "./userAccountService";

// Point this to your real backend
const API_BASE_URL = "http://localhost:5000/api/auth";

// Set to true to log in without a real backend (for UI testing only).
// Set to false once your backend is ready.
const MOCK_MODE = true;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach token automatically to every request, if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const mockLogin = (username, password) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const match = MOCK_USERS.find(
        (u) => u.username === username && getEffectivePassword(u.username, u.defaultPassword) === password
      );

      if (!match) {
        reject({ response: { data: { message: "Invalid username or password." } } });
        return;
      }

      const { defaultPassword: _pw, ...user } = match;
      resolve({ data: { token: "mock-jwt-token", user } });
    }, 500); // simulate network delay
  });
};

// Class Key fallback login — every class-section has a fixed key (1-A's
// key is "1a", 5-B's is "5b", ...) that its class teacher can use instead
// of their password if they've forgotten it. No admin involvement needed.
//
// NOTE: because the key is just the class-section itself, it's a
// convenience shortcut, not a secure secret — fine for this internal
// demo/training tool, but a real deployment with real student data would
// want a proper reset flow (e.g. emailed reset link) instead.
const mockClassKeyLogin = (classKey) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const normalized = String(classKey).trim().toLowerCase().replace(/[\s-]/g, "");
      const match = MOCK_USERS.find(
        (u) => u.role === "TEACHER" && u.classTeacherOf?.toLowerCase().replace("-", "") === normalized
      );

      if (!match) {
        reject({
          response: {
            data: { message: "That class key isn't recognized. Use the format: class + section, e.g. 5a." },
          },
        });
        return;
      }

      const { defaultPassword: _pw, ...user } = match;
      resolve({ data: { token: "mock-jwt-token", user } });
    }, 400);
  });
};

export const login = async (username, password) => {
  const response = MOCK_MODE
    ? await mockLogin(username, password)
    : await api.post("/login", { username, password });

  const { token, user } = response.data;

  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));

  return { token, user };
};

// classKey is "<class><section>", e.g. "5a" for 5-A, "8b" for 8-B.
export const loginWithClassKey = async (classKey) => {
  const response = MOCK_MODE
    ? await mockClassKeyLogin(classKey)
    : await api.post("/login-with-class-key", { classKey });

  const { token, user } = response.data;

  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));

  return { token, user };
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

export const getCurrentUser = () => {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
};

export const getToken = () => localStorage.getItem("token");

export const isAuthenticated = () => !!getToken();

export default api;
