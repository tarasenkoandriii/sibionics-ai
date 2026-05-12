import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export type SaaSUserSource = "telegram-miniapp" | "telegram-oidc";
export type SaaSUserRole = "user" | "admin" | "doctor";
export type SaaSSubscriptionPlan = "trial" | "starter" | "pro" | "family" | "clinic";
export type SaaSSubscriptionStatus = "trial" | "active" | "past_due" | "cancelled" | "pending_payment" | "payment_failed";

export type UpsertTelegramUserInput = {
  telegramId: string | number;
  username?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  locale?: string;
  source: SaaSUserSource;
};

export type SaaSUser = {
  id: string;
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  locale: string;
  role: SaaSUserRole;
  subscriptionPlan: SaaSSubscriptionPlan;
  subscriptionStatus: SaaSSubscriptionStatus;
  onboardingCompleted: boolean;
  authSources: SaaSUserSource[];
  lastLoginAt: string;
  createdAt: string;
  updatedAt: string;
};

function getDir() {
  return path.join(process.env.ORDER_STORE_DIR || path.join(process.cwd(), ".data"), "users");
}

function safeName(value: string) {
  return `${value.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`;
}

function userPathByTelegramId(telegramId: string) {
  return path.join(getDir(), safeName(`telegram_${telegramId}`));
}

async function writeJson(filePath: string, data: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await rename(tmp, filePath);
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch (error: any) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function createUserId(telegramId: string) {
  return `USR-TG-${telegramId}`;
}

export async function readUserByTelegramId(telegramId: string | number) {
  return readJson<SaaSUser>(userPathByTelegramId(String(telegramId)));
}

export async function saveUser(user: SaaSUser) {
  const now = new Date().toISOString();
  const normalized = { ...user, updatedAt: now };
  await writeJson(userPathByTelegramId(user.telegramId), normalized);
  return normalized;
}

export async function upsertTelegramUser(input: UpsertTelegramUserInput) {
  const telegramId = String(input.telegramId);
  const now = new Date().toISOString();
  const current = await readUserByTelegramId(telegramId);
  const authSources = Array.from(new Set([...(current?.authSources || []), input.source]));

  const user: SaaSUser = {
    id: current?.id || createUserId(telegramId),
    telegramId,
    username: input.username || current?.username,
    firstName: input.firstName || current?.firstName,
    lastName: input.lastName || current?.lastName,
    photoUrl: input.photoUrl || current?.photoUrl,
    locale: input.locale || current?.locale || "ua",
    role: current?.role || "user",
    subscriptionPlan: current?.subscriptionPlan || "trial",
    subscriptionStatus: current?.subscriptionStatus || "trial",
    onboardingCompleted: current?.onboardingCompleted || false,
    authSources,
    lastLoginAt: now,
    createdAt: current?.createdAt || now,
    updatedAt: now
  };

  return saveUser(user);
}

export async function markUserOnboardingCompletedByTelegramUsername(username?: string, locale = "ua") {
  // This file-store helper keeps onboarding demo-friendly. A real app should link profiles by uid.
  if (!username) return null;
  return null;
}

export function displayName(user: Pick<SaaSUser, "firstName" | "lastName" | "username" | "telegramId">) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || (user.username ? `@${user.username}` : `Telegram ${user.telegramId}`);
}
