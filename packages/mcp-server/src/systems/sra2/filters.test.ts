/**
 * SRA2 (Shadowrun Anarchy 2) Filter Tests
 * Vitest tests for filter logic and adapter
 */

import { describe, it, expect } from 'vitest';
import { matchesSRA2Filters, describeSRA2Filters, SRA2FiltersSchema } from './filters.js';
import type { SRA2Filters } from './filters.js';
import { SRA2Adapter } from './adapter.js';

const testCharacter = {
  id: 'test-runner-1',
  name: 'Street Samurai',
  type: 'character',
  systemData: {
    actorType: 'character',
    hasAwakened: false,
    hasSpells: false,
    keywords: ['street', 'samurai', 'cyberware'],
  },
};

const testAwakened = {
  id: 'test-mage-1',
  name: 'Combat Mage',
  type: 'character',
  systemData: {
    actorType: 'character',
    hasAwakened: true,
    hasSpells: true,
    keywords: ['magic', 'spellcasting'],
  },
};

const testVehicle = {
  id: 'test-vehicle-1',
  name: 'Armored Van',
  type: 'vehicle',
  systemData: {
    actorType: 'vehicle',
    hasAwakened: false,
    hasSpells: false,
    keywords: ['ground', 'transport'],
  },
};

describe('SRA2 filters', () => {
  it('matches actorType filter (character)', () => {
    const filter: SRA2Filters = { actorType: 'character' };
    expect(matchesSRA2Filters(testCharacter, filter)).toBe(true);
    expect(matchesSRA2Filters(testVehicle, filter)).toBe(false);
  });

  it('matches actorType filter (vehicle)', () => {
    const filter: SRA2Filters = { actorType: 'vehicle' };
    expect(matchesSRA2Filters(testVehicle, filter)).toBe(true);
    expect(matchesSRA2Filters(testCharacter, filter)).toBe(false);
  });

  it('matches hasAwakened filter', () => {
    const filter: SRA2Filters = { hasAwakened: true };
    expect(matchesSRA2Filters(testAwakened, filter)).toBe(true);
    expect(matchesSRA2Filters(testCharacter, filter)).toBe(false);
  });

  it('matches hasSpells filter', () => {
    const filter: SRA2Filters = { hasSpells: true };
    expect(matchesSRA2Filters(testAwakened, filter)).toBe(true);
    expect(matchesSRA2Filters(testCharacter, filter)).toBe(false);
  });

  it('matches keyword filter (partial)', () => {
    const filter: SRA2Filters = { keyword: 'street' };
    expect(matchesSRA2Filters(testCharacter, filter)).toBe(true);
    expect(matchesSRA2Filters(testVehicle, filter)).toBe(false);
  });

  it('matches combined filters', () => {
    const filter: SRA2Filters = {
      actorType: 'character',
      hasAwakened: true,
      keyword: 'magic',
    };
    expect(matchesSRA2Filters(testAwakened, filter)).toBe(true);
    expect(matchesSRA2Filters(testCharacter, filter)).toBe(false);
  });

  it('describeSRA2Filters returns readable string', () => {
    expect(describeSRA2Filters({})).toBe('no filters');
    expect(describeSRA2Filters({ actorType: 'character' })).toContain('character');
    expect(describeSRA2Filters({ keyword: 'street' })).toContain('street');
  });

  it('SRA2FiltersSchema validates valid filters', () => {
    expect(SRA2FiltersSchema.safeParse({ actorType: 'character' }).success).toBe(true);
    expect(SRA2FiltersSchema.safeParse({ hasAwakened: true }).success).toBe(true);
    expect(SRA2FiltersSchema.safeParse({ keyword: 'test' }).success).toBe(true);
  });

  it('SRA2FiltersSchema rejects invalid actorType', () => {
    expect(SRA2FiltersSchema.safeParse({ actorType: 'invalid' }).success).toBe(false);
  });
});

describe('SRA2Adapter', () => {
  const adapter = new SRA2Adapter();

  it('getMetadata returns sra2 system', () => {
    const meta = adapter.getMetadata();
    expect(meta.id).toBe('sra2');
    expect(meta.displayName).toContain('Shadowrun');
    expect(meta.supportedFeatures.creatureIndex).toBe(true);
  });

  it('canHandle accepts sra2 (case insensitive)', () => {
    expect(adapter.canHandle('sra2')).toBe(true);
    expect(adapter.canHandle('SRA2')).toBe(true);
    expect(adapter.canHandle('dnd5e')).toBe(false);
  });

  it('matchesFilters uses filter logic', () => {
    const creature = {
      id: 'x',
      name: 'Test',
      type: 'character',
      packName: 'p',
      packLabel: 'P',
      system: 'sra2' as const,
      systemData: { actorType: 'character', hasAwakened: false },
    };
    expect(adapter.matchesFilters(creature, { actorType: 'character' })).toBe(true);
    expect(adapter.matchesFilters(creature, { actorType: 'vehicle' })).toBe(false);
  });

  it('describeFilters returns string for valid filters', () => {
    expect(adapter.describeFilters({ actorType: 'character' })).toContain('character');
    expect(adapter.describeFilters({})).toBe('no filters');
    // Schema strips unknown keys, so invalid keys yield empty filters → 'no filters'
    expect(adapter.describeFilters({ invalid: 1 })).toBe('no filters');
  });

  it('formatCreatureForList includes systemData', () => {
    const creature = {
      id: 'x',
      name: 'Runner',
      type: 'character',
      packName: 'p',
      packLabel: 'P',
      system: 'sra2' as const,
      systemData: { actorType: 'character', essence: 5, hasAwakened: true },
    };
    const formatted = adapter.formatCreatureForList(creature);
    expect(formatted.id).toBe('x');
    expect(formatted.name).toBe('Runner');
    expect(formatted.stats).toBeDefined();
    expect(formatted.stats.actorType).toBe('character');
    expect(formatted.stats.essence).toBe(5);
    expect(formatted.stats.awakened).toBe(true);
  });

  it('extractCharacterStats pulls system fields', () => {
    const actorData = {
      name: 'Test',
      type: 'character',
      system: {
        attributes: { physical: 10, mental: 8 },
        skills: { firearms: 4 },
        essence: 4.5,
        keywords: ['street'],
        awakened: { spells: [] },
      },
    };
    const stats = adapter.extractCharacterStats(actorData);
    expect(stats.name).toBe('Test');
    expect(stats.attributes).toEqual({ physical: 10, mental: 8 });
    expect(stats.essence).toBe(4.5);
    expect(stats.keywords).toEqual(['street']);
  });

  it('getPowerLevel returns undefined (SRA2 has no CR/level)', () => {
    const creature = {
      id: 'x',
      name: 'X',
      type: 'character',
      packName: 'p',
      packLabel: 'P',
      system: 'sra2' as const,
      systemData: {},
    };
    expect(adapter.getPowerLevel(creature)).toBeUndefined();
  });
});
