/**
 * Shadowrun Anarchy 2 (SRA2) Filter Schemas
 *
 * Actor types: character (PC/NPC), vehicle, drone, ICE
 * @see https://github.com/VincentVk9373/sra2
 */

import { z } from 'zod';

/**
 * SRA2 actor types
 */
export const SRA2ActorTypes = ['character', 'vehicle', 'ice'] as const;
export type SRA2ActorType = typeof SRA2ActorTypes[number];

/**
 * SRA2 filter schema
 */
export const SRA2FiltersSchema = z.object({
  actorType: z.enum(SRA2ActorTypes).optional(),
  hasAwakened: z.boolean().optional(), // magical/matrix abilities
  hasSpells: z.boolean().optional(),
  keyword: z.string().optional() // match keywords
});

export type SRA2Filters = z.infer<typeof SRA2FiltersSchema>;

/**
 * Check if a creature matches SRA2 filters
 */
export function matchesSRA2Filters(creature: any, filters: SRA2Filters): boolean {
  if (filters.actorType) {
    const type = creature.systemData?.actorType ?? creature.type ?? '';
    if (type.toLowerCase() !== filters.actorType.toLowerCase()) {
      return false;
    }
  }

  if (filters.hasAwakened !== undefined) {
    const hasAwakened = creature.systemData?.hasAwakened ?? false;
    if (hasAwakened !== filters.hasAwakened) return false;
  }

  if (filters.hasSpells !== undefined) {
    const hasSpells = creature.systemData?.hasSpells ?? false;
    if (hasSpells !== filters.hasSpells) return false;
  }

  if (filters.keyword) {
    const keywords = creature.systemData?.keywords ?? [];
    const kwList = Array.isArray(keywords) ? keywords : [keywords];
    const match = kwList.some((k: string) =>
      String(k).toLowerCase().includes(filters.keyword!.toLowerCase())
    );
    if (!match) return false;
  }

  return true;
}

/**
 * Generate human-readable description of SRA2 filters
 */
export function describeSRA2Filters(filters: SRA2Filters): string {
  const parts: string[] = [];
  if (filters.actorType) parts.push(filters.actorType);
  if (filters.hasAwakened) parts.push('awakened');
  if (filters.hasSpells) parts.push('spellcaster');
  if (filters.keyword) parts.push(`keyword: ${filters.keyword}`);
  return parts.length > 0 ? parts.join(', ') : 'no filters';
}
