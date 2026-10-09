"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { writeAuditLog } from "@/lib/audit";
import { generateId } from "@/lib/id";
import { can } from "@/lib/permissions";
import {
  getCollection,
  getJSON,
  remove,
  setJSON,
  StorageKeys,
} from "@/lib/storage";
import { DEMO_ACTOR_ID } from "@/lib/seed";
import type { Role, SessionUser, User } from "@/types/erp";

/**
 * DEMO AUTHENTICATION.
 *
 * Accounts live in `localStorage` under `nexora_users` and passwords are
 * stored in plain text on purpose: this is a local demo workspace, not a
 * security boundary. Nothing here is sent anywhere, and nothing here
 * protects real data. See /privacy.
 */

export interface SignupInput {
  name: string;
  email: string;
  password: string;
  role?: Role;
}

export interface LoginInput {
  email: string;
  password: string;
  remember?: boolean;
}

export interface AuthResult {
  ok: boolean;
  error?: string;
  user?: SessionUser;
}

export interface UserPatch {
  name?: string;
  email?: string;
  role?: Role;
  status?: User["status"];
  jobTitle?: string;
}

interface AuthContextValue {
  user: SessionUser | null;
  users: User[];
  hydrated: boolean;
  signup: (input: SignupInput) => AuthResult;
  login: (input: LoginInput) => AuthResult;
  logout: () => void;
  demoLogin: () => AuthResult;
  createUser: (input: SignupInput & { role: Role }) => AuthResult;
  updateUser: (id: string, patch: UserPatch) => AuthResult;
  changePassword: (id: string, password: string) => AuthResult;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const MIN_PASSWORD = 8;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function toSession(user: User): SessionUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

function validateCredentials(
  name: string,
  email: string,
  password: string,
): string | null {
  if (name.trim().length < 2) return "Enter your full name.";
  if (!isValidEmail(email)) return "Enter a valid email address.";
  if (password.length < MIN_PASSWORD) {
    return `Password must be at least ${MIN_PASSWORD} characters.`;
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [session, setSession] = useState<SessionUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // localStorage is an external system: read it off the render pass and
    // commit the result in a microtask so effects never render synchronously.
    queueMicrotask(() => {
      const storedUsers = getCollection<User>(StorageKeys.users);
      const storedSession = getJSON<SessionUser>(StorageKeys.currentUser);
      const validSession =
        storedSession &&
        storedUsers.some(
          (entry) => entry.id === storedSession.id && entry.status === "active",
        )
          ? storedSession
          : null;

      if (storedSession && !validSession) remove(StorageKeys.currentUser);

      setUsers(storedUsers);
      setSession(validSession);
      setHydrated(true);
    });
  }, []);

  const persistUsers = useCallback((next: User[]) => {
    setUsers(next);
    setJSON(StorageKeys.users, next);
  }, []);

  const openSession = useCallback(
    (user: User, remember: boolean): AuthResult => {
      const nextSession = toSession(user);
      setSession(nextSession);
      // Without "remember me" the session is memory only and dies on reload.
      if (remember) {
        setJSON(StorageKeys.currentUser, nextSession);
      } else {
        remove(StorageKeys.currentUser);
      }
      return { ok: true, user: nextSession };
    },
    [],
  );

  const signup = useCallback(
    (input: SignupInput): AuthResult => {
      const name = input.name.trim();
      const email = normalizeEmail(input.email);
      const validation = validateCredentials(name, email, input.password);
      if (validation) return { ok: false, error: validation };

      const existing = getCollection<User>(StorageKeys.users);
      if (existing.some((entry) => entry.email === email)) {
        return { ok: false, error: "An account with that email already exists." };
      }

      const user: User = {
        id: generateId("usr"),
        name,
        email,
        password: input.password,
        role: input.role ?? (existing.length === 0 ? "owner" : "admin"),
        status: "active",
        jobTitle: input.role ? undefined : "Founder",
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };

      persistUsers([...existing, user]);

      writeAuditLog({
        actorId: user.id,
        actorName: user.name,
        action: "create",
        entity: "user",
        entityId: user.id,
        summary: `Created account ${user.email} with role ${user.role}`,
      });

      return openSession(user, true);
    },
    [openSession, persistUsers],
  );

  const login = useCallback(
    (input: LoginInput): AuthResult => {
      const email = normalizeEmail(input.email);
      const stored = getCollection<User>(StorageKeys.users);
      const found = stored.find((entry) => entry.email === email);

      if (!found) return { ok: false, error: "No account found with that email." };
      if (found.password !== input.password) {
        return { ok: false, error: "Incorrect password." };
      }
      if (found.status !== "active") {
        return { ok: false, error: "This account has been deactivated." };
      }

      const lastLoginAt = new Date().toISOString();
      const next = stored.map((entry) =>
        entry.id === found.id ? { ...entry, lastLoginAt } : entry,
      );
      persistUsers(next);

      writeAuditLog({
        actorId: found.id,
        actorName: found.name,
        action: "login",
        entity: "session",
        entityId: found.id,
        summary: `Signed in as ${found.role}`,
      });

      return openSession({ ...found, lastLoginAt }, input.remember === true);
    },
    [openSession, persistUsers],
  );

  const logout = useCallback(() => {
    if (session) {
      writeAuditLog({
        actorId: session.id,
        actorName: session.name,
        action: "logout",
        entity: "session",
        entityId: session.id,
        summary: "Signed out",
      });
    }
    remove(StorageKeys.currentUser);
    setSession(null);
  }, [session]);

  const demoLogin = useCallback((): AuthResult => {
    const stored = getCollection<User>(StorageKeys.users);
    const existing = stored.find((entry) => entry.email === "demo@nexora.local");

    // The demo dataset is only requested while the workspace is untouched.
    const isEmptyWorkspace =
      getCollection(StorageKeys.products).length === 0 &&
      getCollection(StorageKeys.salesInvoices).length === 0;

    if (existing) {
      const normalized = stored.map((entry) =>
        entry.email === "demo@nexora.local"
          ? {
              ...entry,
              id: DEMO_ACTOR_ID,
              status: "active" as const,
              role: "owner" as const,
            }
          : entry,
      );
      persistUsers(normalized);
      if (isEmptyWorkspace) setJSON(StorageKeys.seedRequest, { requestedAt: new Date().toISOString() });
      return login({ email: "demo@nexora.local", password: "demo1234", remember: true });
    }

    const created: User = {
      id: DEMO_ACTOR_ID,
      name: "Demo User",
      email: "demo@nexora.local",
      password: "demo1234",
      role: "owner",
      status: "active",
      jobTitle: "Owner",
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    persistUsers([...stored, created]);
    if (isEmptyWorkspace) {
      setJSON(StorageKeys.seedRequest, { requestedAt: new Date().toISOString() });
    }

    writeAuditLog({
      actorId: created.id,
      actorName: created.name,
      action: "create",
      entity: "user",
      entityId: created.id,
      summary: "Created demo account",
    });

    return openSession(created, true);
  }, [login, openSession, persistUsers]);

  const createUser = useCallback(
    (input: SignupInput & { role: Role }): AuthResult => {
      if (!session) return { ok: false, error: "Sign in first." };
      if (!can(session, "manage", "users")) {
        return { ok: false, error: "Your role cannot manage users." };
      }

      const name = input.name.trim();
      const email = normalizeEmail(input.email);
      const validation = validateCredentials(name, email, input.password);
      if (validation) return { ok: false, error: validation };

      const stored = getCollection<User>(StorageKeys.users);
      if (stored.some((entry) => entry.email === email)) {
        return { ok: false, error: "An account with that email already exists." };
      }

      const user: User = {
        id: generateId("usr"),
        name,
        email,
        password: input.password,
        role: input.role,
        status: "active",
        createdAt: new Date().toISOString(),
      };

      persistUsers([...stored, user]);

      writeAuditLog({
        actorId: session.id,
        actorName: session.name,
        action: "create",
        entity: "user",
        entityId: user.id,
        summary: `Invited ${user.email} as ${user.role}`,
      });

      return { ok: true, user: toSession(user) };
    },
    [persistUsers, session],
  );

  const updateUser = useCallback(
    (id: string, patch: UserPatch): AuthResult => {
      if (!session) return { ok: false, error: "Sign in first." };
      if (!can(session, "manage", "users")) {
        return { ok: false, error: "Your role cannot manage users." };
      }

      const stored = getCollection<User>(StorageKeys.users);
      const target = stored.find((entry) => entry.id === id);
      if (!target) return { ok: false, error: "User not found." };

      if (id === session.id && (patch.status === "deactivated" || (patch.role && patch.role !== "owner"))) {
        return { ok: false, error: "You cannot change your own access." };
      }

      if (patch.email) {
        const nextEmail = normalizeEmail(patch.email);
        if (!isValidEmail(nextEmail)) {
          return { ok: false, error: "Enter a valid email address." };
        }
        if (
          stored.some(
            (entry) => entry.id !== id && entry.email === nextEmail,
          )
        ) {
          return { ok: false, error: "That email is already in use." };
        }
        patch = { ...patch, email: nextEmail };
      }

      const previous = {
        name: target.name,
        email: target.email,
        role: target.role,
        status: target.status,
        jobTitle: target.jobTitle,
      };

      const next = stored.map((entry) =>
        entry.id === id
          ? { ...entry, ...patch, updatedAt: new Date().toISOString() }
          : entry,
      );
      persistUsers(next);

      const changedKeys = Object.keys(patch) as Array<keyof UserPatch>;
      const before: Record<string, unknown> = {};
      const after: Record<string, unknown> = {};
      for (const key of changedKeys) {
        before[key] = previous[key];
        after[key] = patch[key];
      }

      writeAuditLog({
        actorId: session.id,
        actorName: session.name,
        action: "update",
        entity: "user",
        entityId: id,
        entityNumber: target.email,
        summary: `Updated user ${target.email}`,
        before,
        after,
      });

      return { ok: true, user: toSession({ ...target, ...patch }) };
    },
    [persistUsers, session],
  );

  const changePassword = useCallback(
    (id: string, password: string): AuthResult => {
      if (!session) return { ok: false, error: "Sign in first." };
      if (password.length < MIN_PASSWORD) {
        return {
          ok: false,
          error: `Password must be at least ${MIN_PASSWORD} characters.`,
        };
      }

      const isSelf = session.id === id;
      if (!isSelf && !can(session, "manage", "users")) {
        return { ok: false, error: "Your role cannot manage users." };
      }

      const stored = getCollection<User>(StorageKeys.users);
      if (!stored.some((entry) => entry.id === id)) {
        return { ok: false, error: "User not found." };
      }

      persistUsers(
        stored.map((entry) =>
          entry.id === id
            ? { ...entry, password, updatedAt: new Date().toISOString() }
            : entry,
        ),
      );

      writeAuditLog({
        actorId: session.id,
        actorName: session.name,
        action: "update",
        entity: "user",
        entityId: id,
        summary: isSelf ? "Changed own password" : "Reset user password",
      });

      return { ok: true };
    },
    [persistUsers, session],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session,
      users,
      hydrated,
      signup,
      login,
      logout,
      demoLogin,
      createUser,
      updateUser,
      changePassword,
    }),
    [
      session,
      users,
      hydrated,
      signup,
      login,
      logout,
      demoLogin,
      createUser,
      updateUser,
      changePassword,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used inside <AuthProvider>");
  }
  return context;
}
