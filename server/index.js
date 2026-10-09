import dotenv from "dotenv";
import express from "express";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const app = express();
const port = Number(process.env.API_PORT) || 3001;
const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD || "";
const sessionCookie = "moneymaster_session";
const sessionLifetime = 1000 * 60 * 60 * 24 * 14;
const dataFile = path.resolve(
  process.env.DATA_FILE ||
    (process.env.VERCEL
      ? path.join("/tmp", "moneymaster-data.json")
      : path.join(path.dirname(fileURLToPath(import.meta.url)), "data.json")),
);
const sessions = new Map();
const authAttempts = new Map();

mkdirSync(path.dirname(dataFile), { recursive: true });
let store = { users: [] };
if (existsSync(dataFile)) {
  try {
    store = JSON.parse(readFileSync(dataFile, "utf8"));
  } catch {
    throw new Error(
      "server/data.json is invalid JSON; back it up and repair it before starting.",
    );
  }
}
if (!Array.isArray(store.users)) store.users = [];

const adminCredentialsReady = Boolean(adminEmail && adminPassword.length >= 6);
if (!adminCredentialsReady) {
  console.warn(
    "Admin sign-in is disabled until ADMIN_EMAIL and an ADMIN_PASSWORD of at least 6 characters are set in .env.local.",
  );
}

const hashPassword = (password, salt = randomBytes(16).toString("hex")) => ({
  salt,
  hash: scryptSync(password, salt, 64).toString("hex"),
});
const verifyPassword = (password, saved) => {
  if (!saved?.salt || !saved?.hash) return false;
  const expected = Buffer.from(saved.hash, "hex");
  if (expected.length !== 64) return false;
  const actual = scryptSync(password, saved.salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};
const saveStore = () => {
  const temporaryFile = `${dataFile}.tmp`;
  writeFileSync(temporaryFile, JSON.stringify(store, null, 2), { mode: 0o600 });
  renameSync(temporaryFile, dataFile);
};
const makeDefaultFinance = () => {
  const today = new Date();
  const dateAt = (offset) => {
    const date = new Date(
      today.getFullYear(),
      today.getMonth(),
      Math.max(1, today.getDate() - offset),
    );
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };
  return {
    transactions: [
      {
        id: randomBytes(8).toString("hex"),
        title: "Oylik maosh",
        category: "Ish haqi",
        amount: 1_000_000,
        type: "income",
        date: dateAt(0),
      },
      {
        id: randomBytes(8).toString("hex"),
        title: "Haftalik bozor",
        category: "Oziq-ovqat",
        amount: 200_000,
        type: "expense",
        date: dateAt(1),
      },
      {
        id: randomBytes(8).toString("hex"),
        title: "O‘yinlar",
        category: "O'yin-kulgi",
        amount: 100_000,
        type: "expense",
        date: dateAt(3),
      },
      {
        id: randomBytes(8).toString("hex"),
        title: "Metro va taksi",
        category: "Transport",
        amount: 150_000,
        type: "expense",
        date: dateAt(4),
      },
    ],
    goal: {
      name: "Yangi telefon",
      target: 3_000_000,
      saved: 520_000,
      monthly: 250_000,
    },
    challengeDays: [],
  };
};
if (!store.adminFinance) store.adminFinance = makeDefaultFinance();
const sanitizeFinance = (value) => ({
  transactions: Array.isArray(value?.transactions)
    ? value.transactions.slice(0, 1000)
    : [],
  goal: {
    name: String(value?.goal?.name || "Yangi telefon").slice(0, 100),
    target: Math.max(0, Number(value?.goal?.target) || 0),
    saved: Math.max(0, Number(value?.goal?.saved) || 0),
    monthly: Math.max(0, Number(value?.goal?.monthly) || 0),
  },
  challengeDays: Array.isArray(value?.challengeDays)
    ? value.challengeDays.slice(-365)
    : [],
});
const readSessionToken = (request) =>
  request.headers.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${sessionCookie}=`))
    ?.slice(sessionCookie.length + 1);
const setSessionCookie = (response, token) =>
  response.cookie(sessionCookie, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: sessionLifetime,
    path: "/",
  });
const clearSessionCookie = (response) =>
  response.clearCookie(sessionCookie, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
const createSession = (response, user) => {
  const token = randomBytes(32).toString("hex");
  sessions.set(token, {
    id: user.id,
    role: user.role,
    expiresAt: Date.now() + sessionLifetime,
  });
  setSessionCookie(response, token);
};
const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role || "user",
});
const throttleAuth = (request, response, next) => {
  const now = Date.now();
  const attempts = authAttempts.get(request.ip);
  if (attempts && attempts.resetAt > now && attempts.count >= 10) {
    return response.status(429).json({
      error: "Juda ko‘p urinish. 15 daqiqadan keyin qayta urinib ko‘ring.",
    });
  }
  authAttempts.set(
    request.ip,
    attempts && attempts.resetAt > now
      ? { count: attempts.count + 1, resetAt: attempts.resetAt }
      : { count: 1, resetAt: now + 15 * 60 * 1000 },
  );
  next();
};

app.disable("x-powered-by");
app.use(express.json({ limit: "64kb" }));
app.use((request, response, next) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "same-origin");
  next();
});

const requireAuth = (request, response, next) => {
  const token = readSessionToken(request);
  const session = token && sessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    if (token) sessions.delete(token);
    clearSessionCookie(response);
    return response.status(401).json({ error: "Hisobga qayta kiring." });
  }
  if (session.role === "admin") {
    request.account = {
      id: session.id,
      role: "admin",
      email: adminEmail,
      name: "Administrator",
    };
    request.sessionToken = token;
    return next();
  }
  const user = store.users.find(
    (item) => item.id === session.id && !item.suspended,
  );
  if (!user) {
    sessions.delete(token);
    clearSessionCookie(response);
    return response
      .status(401)
      .json({ error: "Hisob faol emas yoki sessiya bekor qilingan." });
  }
  request.account = user;
  request.sessionToken = token;
  next();
};
const requireAdmin = (request, response, next) => {
  if (request.account.role !== "admin")
    return response.status(403).json({ error: "Administrator huquqi kerak." });
  next();
};

app.get("/api/health", (_request, response) => response.json({ ok: true }));
app.post("/api/auth/register", throttleAuth, (request, response) => {
  const name = String(request.body?.name || "")
    .trim()
    .slice(0, 80);
  const email = String(request.body?.email || "")
    .trim()
    .toLowerCase();
  const password = String(request.body?.password || "");
  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return response
      .status(400)
      .json({ error: "Ism va to‘g‘ri email kiriting." });
  if (password.length < 6)
    return response
      .status(400)
      .json({ error: "Parol kamida 6 ta belgidan iborat bo‘lsin." });
  if (email === adminEmail || store.users.some((user) => user.email === email))
    return response.status(409).json({ error: "Bu email bilan hisob mavjud." });
  const user = {
    id: randomBytes(16).toString("hex"),
    name,
    email,
    password: hashPassword(password),
    createdAt: new Date().toISOString(),
    suspended: false,
    finance: makeDefaultFinance(),
  };
  store.users.push(user);
  saveStore();
  authAttempts.delete(request.ip);
  createSession(response, { id: user.id, role: "user" });
  response.status(201).json({ user: publicUser(user), finance: user.finance });
});
app.post("/api/auth/login", throttleAuth, (request, response) => {
  const email = String(request.body?.email || "")
    .trim()
    .toLowerCase();
  const password = String(request.body?.password || "");
  if (
    adminCredentialsReady &&
    email === adminEmail &&
    verifyPassword(
      password,
      hashPassword(adminPassword, "moneymaster-admin-v1"),
    )
  ) {
    const user = {
      id: "admin",
      role: "admin",
      email: adminEmail,
      name: "Administrator",
    };
    authAttempts.delete(request.ip);
    createSession(response, user);
    return response.json({ user: publicUser(user) });
  }
  const user = store.users.find((item) => item.email === email);
  if (!user || user.suspended || !verifyPassword(password, user.password))
    return response.status(401).json({ error: "Email yoki parol noto‘g‘ri." });
  authAttempts.delete(request.ip);
  createSession(response, { id: user.id, role: "user" });
  response.json({ user: publicUser(user), finance: user.finance });
});
app.get("/api/auth/me", requireAuth, (request, response) =>
  response.json({ user: publicUser(request.account) }),
);
app.post("/api/auth/logout", (request, response) => {
  const token = readSessionToken(request);
  if (token) sessions.delete(token);
  clearSessionCookie(response);
  response.json({ ok: true });
});
app.get("/api/finance", requireAuth, (request, response) =>
  response.json({
    finance:
      request.account.role === "admin"
        ? store.adminFinance
        : request.account.finance,
  }),
);
app.put("/api/finance", requireAuth, (request, response) => {
  if (request.account.role === "admin") {
    store.adminFinance = sanitizeFinance(request.body);
  } else {
    request.account.finance = sanitizeFinance(request.body);
  }
  saveStore();
  response.json({ ok: true });
});
app.get("/api/admin/users", requireAuth, requireAdmin, (_request, response) => {
  response.json({
    users: store.users.map(({ id, name, email, createdAt, suspended }) => ({
      id,
      name,
      email,
      createdAt,
      suspended,
    })),
  });
});
app.patch(
  "/api/admin/users/:id",
  requireAuth,
  requireAdmin,
  (request, response) => {
    const user = store.users.find((item) => item.id === request.params.id);
    if (!user)
      return response.status(404).json({ error: "Foydalanuvchi topilmadi." });
    if (typeof request.body?.suspended !== "boolean")
      return response.status(400).json({ error: "Holatni yuboring." });
    user.suspended = request.body.suspended;
    if (user.suspended) {
      for (const [token, session] of sessions) {
        if (session.id === user.id) sessions.delete(token);
      }
    }
    saveStore();
    response.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        suspended: user.suspended,
      },
    });
  },
);

if (!process.env.VERCEL) {
  app.listen(port, "127.0.0.1", () =>
    console.log(`MoneyMaster API listening on http://127.0.0.1:${port}`),
  );
}

export default app;
