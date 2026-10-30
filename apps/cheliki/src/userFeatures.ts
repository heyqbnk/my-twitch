import config from './userFeatures.json';

/** Per-viewer tweaks, set by login in userFeatures.json. */
export interface UserFeatures {
  /** Bare legs instead of pants. */
  noPants?: boolean;
  /** Bare feet instead of shoes. */
  noShoes?: boolean;
}

const USERS: Record<string, UserFeatures> = config.users;

export function userFeatures(login: string): UserFeatures {
  return USERS[login.toLowerCase()] ?? {};
}
