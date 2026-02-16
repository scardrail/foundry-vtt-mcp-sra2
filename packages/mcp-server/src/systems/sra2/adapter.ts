/**
 * Shadowrun Anarchy 2 (SRA2) System Adapter
 *
 * Implements SystemAdapter for Shadowrun Anarchy 2 (Foundry system id: sra2).
 * Actor types: character (PC/NPC), vehicle, drone, ICE.
 * @see https://github.com/VincentVk9373/sra2
 */

import type {
  SystemAdapter,
  SystemMetadata,
  SystemCreatureIndex,
  SRA2CreatureIndex
} from '../types.js';
import {
  SRA2FiltersSchema,
  matchesSRA2Filters,
  describeSRA2Filters,
  type SRA2Filters
} from './filters.js';

export class SRA2Adapter implements SystemAdapter {
  getMetadata(): SystemMetadata {
    return {
      id: 'sra2',
      name: 'sra2',
      displayName: 'Shadowrun Anarchy 2',
      version: '1.0.0',
      description:
        'Support for Shadowrun Anarchy 2 with character, vehicle, drone, and ICE actor types',
      supportedFeatures: {
        creatureIndex: true,
        characterStats: true,
        spellcasting: true,
        powerLevel: false // SRA2 uses different metrics (essence, etc.)
      }
    };
  }

  canHandle(systemId: string): boolean {
    return systemId.toLowerCase() === 'sra2';
  }

  extractCreatureData(_doc: any, _pack: any): { creature: SystemCreatureIndex; errors: number } | null {
    throw new Error(
      'extractCreatureData should be called from SRA2 index builder in Foundry module, not the adapter'
    );
  }

  getFilterSchema() {
    return SRA2FiltersSchema;
  }

  matchesFilters(creature: SystemCreatureIndex, filters: Record<string, any>): boolean {
    const validated = SRA2FiltersSchema.safeParse(filters);
    if (!validated.success) return false;
    return matchesSRA2Filters(creature, validated.data as SRA2Filters);
  }

  getDataPaths(): Record<string, string | null> {
    return {
      actorType: 'type',
      keywords: 'system.keywords',
      essence: 'system.essence',
      hitPoints: 'system.attributes.physical',
      armorClass: null,
      abilities: 'system.attributes',
      skills: 'system.skills',
      spells: 'system.awakened',
      challengeRating: null,
      level: null,
      creatureType: null,
      size: null,
      alignment: null,
      perception: null,
      saves: null,
      rarity: null,
      legendaryActions: null
    };
  }

  formatCreatureForList(creature: SystemCreatureIndex): any {
    const sra2Creature = creature as SRA2CreatureIndex;
    const formatted: any = {
      id: creature.id,
      name: creature.name,
      type: creature.type,
      pack: { id: creature.packName, label: creature.packLabel }
    };
    if (sra2Creature.systemData) {
      const stats: any = {};
      if (sra2Creature.systemData.actorType) stats.actorType = sra2Creature.systemData.actorType;
      if (sra2Creature.systemData.essence !== undefined) stats.essence = sra2Creature.systemData.essence;
      if (sra2Creature.systemData.hasAwakened) stats.awakened = true;
      if (sra2Creature.systemData.hasSpells) stats.spellcaster = true;
      if (sra2Creature.systemData.keywords?.length)
        stats.keywords = sra2Creature.systemData.keywords;
      if (Object.keys(stats).length > 0) formatted.stats = stats;
    }
    if (creature.img) formatted.hasImage = true;
    return formatted;
  }

  formatCreatureForDetails(creature: SystemCreatureIndex): any {
    const sra2Creature = creature as SRA2CreatureIndex;
    const formatted = this.formatCreatureForList(creature);
    if (sra2Creature.systemData) {
      formatted.detailedStats = {
        actorType: sra2Creature.systemData.actorType,
        essence: sra2Creature.systemData.essence,
        hasAwakened: sra2Creature.systemData.hasAwakened,
        hasSpells: sra2Creature.systemData.hasSpells,
        keywords: sra2Creature.systemData.keywords
      };
    }
    if (creature.img) formatted.img = creature.img;
    return formatted;
  }

  describeFilters(filters: Record<string, any>): string {
    const validated = SRA2FiltersSchema.safeParse(filters);
    if (!validated.success) return 'invalid filters';
    return describeSRA2Filters(validated.data as SRA2Filters);
  }

  getPowerLevel(_creature: SystemCreatureIndex): number | undefined {
    return undefined; // SRA2 doesn't use CR/level
  }

  extractCharacterStats(actorData: any): any {
    const system = actorData.system || {};
    const stats: any = { name: actorData.name, type: actorData.type };

    if (system.attributes) stats.attributes = system.attributes;
    if (system.skills) stats.skills = system.skills;
    if (system.essence !== undefined) stats.essence = system.essence;
    if (system.keywords) stats.keywords = system.keywords;
    if (system.awakened) stats.awakened = system.awakened;

    // Physical/Mental/Matrix damage gauges
    if (system.attributes?.physical) stats.physical = system.attributes.physical;
    if (system.attributes?.mental) stats.mental = system.attributes.mental;
    if (system.attributes?.matrix) stats.matrix = system.attributes.matrix;

    return stats;
  }
}
