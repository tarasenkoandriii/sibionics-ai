import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export type OnboardingProfile = {
  profileId: string;
  locale: string;
  name: string;
  age?: number;
  diabetesType?: string;
  therapy?: string;
  cgmDevice?: string;
  lowThresholdMgDl: number;
  highThresholdMgDl: number;
  goals?: string;
  telegramUsername?: string;
  createdAt: string;
  updatedAt: string;
};

function getDir() {
  return path.join(process.env.ORDER_STORE_DIR || path.join(process.cwd(), ".data"), "onboarding");
}

function filePath(profileId: string) {
  return path.join(getDir(), `${profileId.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`);
}

export function createProfileId() {
  return `PAT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function saveOnboardingProfile(profile: OnboardingProfile) {
  await mkdir(getDir(), { recursive: true });
  const now = new Date().toISOString();
  const normalized = { ...profile, updatedAt: now, createdAt: profile.createdAt || now };
  const target = filePath(profile.profileId);
  const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, JSON.stringify(normalized, null, 2), "utf8");
  await rename(tmp, target);
  return normalized;
}

export async function readOnboardingProfile(profileId: string) {
  try {
    return JSON.parse(await readFile(filePath(profileId), "utf8")) as OnboardingProfile;
  } catch (error: any) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}
