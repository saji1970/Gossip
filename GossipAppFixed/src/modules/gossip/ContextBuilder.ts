import { Group } from '../../utils/GroupStorage';
import { MemberSearchResult, GroupSearchResult } from './types';

/** Extract a display name from an email (part before @). */
function emailToName(email: string): string {
  return email.split('@')[0] || email;
}

/** Score how well `query` matches `target` (0–1). */
function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  if (q === t) return 1.0;
  if (t.startsWith(q)) return 0.9;
  if (t.includes(q)) return 0.7;

  // Word-level partial: check if any word in target starts with query
  const words = t.split(/[\s._-]+/);
  for (const w of words) {
    if (w.startsWith(q)) return 0.6;
  }

  return 0;
}

/**
 * Search all groups for a member matching `name`.
 * Returns deduplicated results with the list of groups each member is in.
 */
export function findMember(
  name: string,
  groups: Group[],
): MemberSearchResult[] {
  if (!name.trim()) return [];

  const memberMap = new Map<string, MemberSearchResult>();

  for (const group of groups) {
    for (const member of group.members) {
      const displayName = emailToName(member.email);
      const score = Math.max(
        fuzzyScore(name, displayName),
        fuzzyScore(name, member.email),
      );

      if (score < 0.5) continue;

      const existing = memberMap.get(member.email);
      if (existing) {
        existing.groups.push({ id: group.id, name: group.name });
        existing.score = Math.max(existing.score, score);
      } else {
        memberMap.set(member.email, {
          email: member.email,
          displayName,
          groups: [{ id: group.id, name: group.name }],
          score,
        });
      }
    }
  }

  return Array.from(memberMap.values()).sort((a, b) => b.score - a.score);
}

/** Search groups by name. */
export function findGroup(
  name: string,
  groups: Group[],
): GroupSearchResult[] {
  if (!name.trim()) return [];

  const results: GroupSearchResult[] = [];

  for (const group of groups) {
    const score = fuzzyScore(name, group.name);
    if (score >= 0.5) {
      results.push({ group, score });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

/** Get groups that both the current user and a given member share. */
export function getSharedGroups(
  memberEmail: string,
  userEmail: string,
  groups: Group[],
): Group[] {
  return groups.filter(g =>
    g.members.some(m => m.email === memberEmail) &&
    g.members.some(m => m.email === userEmail),
  );
}
