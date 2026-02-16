import * as fs from 'fs';
import { z } from 'zod';
import { FoundryClient } from '../foundry-client.js';
import { Logger } from '../logger.js';
import { ErrorHandler } from '../utils/error-handler.js';

export interface ActorCreationToolsOptions {
  foundryClient: FoundryClient;
  logger: Logger;
}


export class ActorCreationTools {
  private foundryClient: FoundryClient;
  private logger: Logger;
  private errorHandler: ErrorHandler;

  constructor({ foundryClient, logger }: ActorCreationToolsOptions) {
    this.foundryClient = foundryClient;
    this.logger = logger.child({ component: 'ActorCreationTools' });
    this.errorHandler = new ErrorHandler(this.logger);
  }

  /**
   * Tool definitions for actor creation operations
   */
  getToolDefinitions() {
    return [
      {
        name: 'create-actor-from-compendium',
        description: 'Create one or more actors from a specific compendium entry with custom names. Use search-compendium first to find the exact creature you want, then use this tool with the packId and itemId from the search results.',
        inputSchema: {
          type: 'object',
          properties: {
            packId: {
              type: 'string',
              description: 'ID of the compendium pack containing the creature (e.g., "dnd5e.monsters")',
            },
            itemId: {
              type: 'string', 
              description: 'ID of the specific creature entry within the pack (get this from search-compendium results)',
            },
            names: {
              type: 'array',
              items: { type: 'string' },
              description: 'Custom names for the created actors (e.g., ["Flameheart", "Sneak", "Peek"])',
              minItems: 1,
            },
            quantity: {
              type: 'number',
              description: 'Number of actors to create (default: based on names array length)',
              minimum: 1,
              maximum: 10,
            },
            addToScene: {
              type: 'boolean',
              description: 'Whether to add created actors to the current scene as tokens',
              default: false,
            },
            placement: {
              type: 'object',
              description: 'Token placement options (only used when addToScene is true)',
              properties: {
                type: {
                  type: 'string',
                  enum: ['random', 'grid', 'center', 'coordinates'],
                  description: 'Placement strategy',
                  default: 'grid',
                },
                coordinates: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      x: { type: 'number', description: 'X coordinate in pixels' },
                      y: { type: 'number', description: 'Y coordinate in pixels' },
                    },
                    required: ['x', 'y'],
                  },
                  description: 'Specific coordinates for each token (required when type is "coordinates")',
                },
              },
              required: ['type'],
            },
          },
          required: ['packId', 'itemId', 'names'],
        },
      },
      {
        name: 'get-compendium-entry-full',
        description: 'Retrieve complete stat block data including items, spells, and abilities for actor creation',
        inputSchema: {
          type: 'object',
          properties: {
            packId: {
              type: 'string',
              description: 'Compendium pack identifier',
            },
            entryId: {
              type: 'string',
              description: 'Entry identifier within the pack',
            },
          },
          required: ['packId', 'entryId'],
        },
      },
      {
        name: 'create-sra2-actor',
        description: 'Create an SRA2 actor (character, vehicle, or ICE) with full content: name, type, biography, system data (attributes, keywords), linked items (metatype, traits, weapons, etc.), and skill values. Use for importing pregens or characters created elsewhere. Items can be world item IDs (itemIds) or inline definitions (items). Skills can be a simple map of skill name to value.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Display name of the actor',
            },
            actorType: {
              type: 'string',
              enum: ['character', 'vehicle', 'ice'],
              description: 'SRA2 actor type: character (PC/NPC), vehicle, or ice (Matrix ICE)',
            },
            folderName: {
              type: 'string',
              description: 'Optional folder name (default: Foundry MCP SRA2)',
            },
            addToScene: {
              type: 'boolean',
              description: 'If true, add the actor to the current scene as a token',
              default: false,
            },
            biography: {
              type: 'string',
              description: 'Optional biography (system.bio.background)',
            },
            system: {
              type: 'object',
              description: 'Optional system overrides: e.g. attributes (strength, agility, willpower, logic, charisma), keywords (keyword1..keyword5). Merged into actor system.',
            },
            itemIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional world item IDs to add to the actor (metatype, traits, weapons, etc.). Items must exist in the world.',
            },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  itemType: { type: 'string', enum: ['skill', 'feat', 'specialization', 'metatype'] },
                  description: { type: 'string' },
                  system: { type: 'object' },
                  img: { type: 'string' },
                },
                required: ['name', 'itemType'],
              },
              description: 'Optional inline items to create and add (name, itemType, description?, system?, img?).',
            },
            skills: {
              type: 'object',
              additionalProperties: { type: 'number' },
              description: 'Optional skill values: { "Conduite": 3, "Pistolets": 4 }. Creates skill items and adds them to the actor.',
            },
          },
          required: ['name', 'actorType'],
        },
      },
      {
        name: 'create-sra2-item',
        description: 'Create an SRA2 item from content you provide: name, type, and optionally description and system data. Items are placed in folders by type (Skills, Feats, Weapons, Spells, Equipment, etc.). Use this to create items from your own content, not from a compendium. If actorId is set, the item is added to that actor; otherwise it is created in the world.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Display name of the item',
            },
            itemType: {
              type: 'string',
              enum: ['skill', 'feat', 'specialization', 'metatype'],
              description: 'SRA2 item type',
            },
            description: {
              type: 'string',
              description: 'Optional description or full text content of the item',
            },
            system: {
              type: 'object',
              description: 'Optional system data (e.g. featType, damage, ranges). For feats, featType can be weapon, spell, equipment, armor, etc. to control folder placement.',
            },
            img: {
              type: 'string',
              description: 'Optional image path or URL for the item',
            },
            actorId: {
              type: 'string',
              description: 'Optional: ID of an actor to add this item to',
            },
            folderName: {
              type: 'string',
              description: 'Optional folder name for world items (ignored if actorId is set). If omitted, folder is chosen by type (e.g. Weapons, Spells).',
            },
          },
          required: ['name', 'itemType'],
        },
      },
      {
        name: 'update-sra2-actor-biography',
        description: 'Update the biography/description of an existing SRA2 character (system.bio.background). Use findActor or list-characters to get actor id.',
        inputSchema: {
          type: 'object',
          properties: {
            actorId: { type: 'string', description: 'ID of the SRA2 character actor' },
            biography: { type: 'string', description: 'New biography text (plain text or HTML)' },
          },
          required: ['actorId', 'biography'],
        },
      },
      {
        name: 'import-actors-from-anarchy-export',
        description: 'Import all actors from an Anarchy v1 full export JSON into the current world (SRA2). Converts data per the Anarchy v2 B5 conversion guide (attributes scale, skills, weapons, shadowamps→feats, etc.). Respects folder path when the export includes a folders array; otherwise places actors under baseFolderPath/Personnages or baseFolderPath/Véhicules. World must be using system SRA2.',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: 'Absolute path to the export JSON file (e.g. G:\\Mon Drive\\Obsidian\\Shadowrun\\Chti Runners\\foundry-all-actors-export.json). If provided, jsonContent is ignored.',
            },
            jsonContent: {
              type: 'string',
              description: 'Raw JSON string of the export (exportedAt, world, actors, folders?). Use when file path is not available.',
            },
            baseFolderPath: {
              type: 'string',
              description: 'Base folder path for imported actors (e.g. "Chti Runners"). Default: "Import Anarchy".',
            },
          },
        },
      },
    ];
  }

  /**
   * Handle actor creation from specific compendium entry
   */
  async handleCreateActorFromCompendium(args: any): Promise<any> {
    const schema = z.object({
      packId: z.string().min(1, 'Pack ID cannot be empty'),
      itemId: z.string().min(1, 'Item ID cannot be empty'),
      names: z.array(z.string().min(1)).min(1, 'At least one name is required'),
      quantity: z.number().min(1).max(10).optional(),
      addToScene: z.boolean().default(false),
      placement: z.object({
        type: z.enum(['random', 'grid', 'center', 'coordinates']).default('grid'),
        coordinates: z.array(z.object({
          x: z.number(),
          y: z.number(),
        })).optional(),
      }).optional(),
    });

    const { packId, itemId, names, quantity, addToScene, placement } = schema.parse(args);
    const finalQuantity = quantity || names.length;

    this.logger.info('Creating actors from specific compendium entry', {
      packId,
      itemId,
      names,
      quantity: finalQuantity,
      addToScene,
    });

    try {
      // Ensure we have enough names for the quantity
      const customNames = [...names];
      while (customNames.length < finalQuantity) {
        const baseName = names[0] || 'Unnamed';
        customNames.push(`${baseName} ${customNames.length + 1}`);
      }

      // Create the actors via Foundry module using exact pack/item IDs
      const result = await this.foundryClient.query('foundry-mcp-bridge.createActorFromCompendium', {
        packId,
        itemId,
        customNames: customNames.slice(0, finalQuantity),
        quantity: finalQuantity,
        addToScene,
        placement: placement ? {
          type: placement.type,
          coordinates: placement.coordinates,
        } : undefined,
      });

      this.logger.info('Actor creation completed', {
        totalCreated: result.totalCreated,
        totalRequested: result.totalRequested,
        tokensPlaced: result.tokensPlaced || 0,
        hasErrors: !!result.errors,
      });

      // Format response for Claude
      return this.formatSimpleActorCreationResponse(result, packId, itemId, customNames.slice(0, finalQuantity));

    } catch (error) {
      this.errorHandler.handleToolError(error, 'create-actor-from-compendium', 'actor creation');
    }
  }

  /**
   * Handle getting full compendium entry data
   */
  async handleGetCompendiumEntryFull(args: any): Promise<any> {
    const schema = z.object({
      packId: z.string().min(1, 'Pack ID cannot be empty'),
      entryId: z.string().min(1, 'Entry ID cannot be empty'),
    });

    const { packId, entryId } = schema.parse(args);

    this.logger.info('Getting full compendium entry', { packId, entryId });

    try {
      const fullEntry = await this.foundryClient.query('foundry-mcp-bridge.getCompendiumDocumentFull', {
        packId,
        documentId: entryId,
      });

      this.logger.debug('Successfully retrieved full compendium entry', {
        packId,
        entryId,
        name: fullEntry.name,
        hasItems: !!fullEntry.items?.length,
        hasEffects: !!fullEntry.effects?.length,
      });

      return this.formatCompendiumEntryResponse(fullEntry);

    } catch (error) {
      this.errorHandler.handleToolError(error, 'get-compendium-entry-full', 'compendium retrieval');
    }
  }

  /**
   * Create a new SRA2 actor (character, vehicle, or ice)
   */
  async handleCreateSRA2Actor(args: any): Promise<any> {
    const itemDefSchema = z.object({
      name: z.string().min(1),
      itemType: z.enum(['skill', 'feat', 'specialization', 'metatype']),
      description: z.string().optional(),
      system: z.record(z.unknown()).optional(),
      img: z.string().optional(),
    });
    const schema = z.object({
      name: z.string().min(1, 'name is required'),
      actorType: z.enum(['character', 'vehicle', 'ice']),
      folderName: z.string().optional(),
      addToScene: z.boolean().default(false),
      biography: z.string().optional(),
      system: z.record(z.unknown()).optional(),
      itemIds: z.array(z.string()).optional(),
      items: z.array(itemDefSchema).optional(),
      skills: z.record(z.number()).optional(),
    });
    const parsed = schema.parse(args);
    const payload: Record<string, unknown> = {
      name: parsed.name,
      actorType: parsed.actorType,
      addToScene: parsed.addToScene,
    };
    if (parsed.folderName !== undefined) payload.folderName = parsed.folderName;
    if (parsed.biography != null && parsed.biography !== '') payload.biography = parsed.biography;
    if (parsed.system !== undefined && Object.keys(parsed.system).length > 0) payload.system = parsed.system;
    if (parsed.itemIds !== undefined && parsed.itemIds.length > 0) payload.itemIds = parsed.itemIds;
    if (parsed.items !== undefined && parsed.items.length > 0) payload.items = parsed.items;
    if (parsed.skills !== undefined && Object.keys(parsed.skills).length > 0) payload.skills = parsed.skills;
    try {
      const result = await this.foundryClient.query('foundry-mcp-bridge.createSRA2Actor', payload);
      this.logger.info('Created SRA2 actor from content', { id: result.id, name: result.name, type: result.type, itemsAdded: result.itemsAdded });
      const itemsNote = result.itemsAdded != null && result.itemsAdded > 0 ? ` (${result.itemsAdded} item(s) added)` : '';
      return {
        success: true,
        actor: result,
        message: `Created SRA2 ${parsed.actorType}: **${result.name}** (id: ${result.id})${itemsNote}.`,
      };
    } catch (error) {
      this.errorHandler.handleToolError(error, 'create-sra2-actor', 'SRA2 actor creation');
    }
  }

  /**
   * Create a new SRA2 item (skill, feat, specialization, metatype)
   */
  async handleCreateSRA2Item(args: any): Promise<any> {
    const schema = z.object({
      name: z.string().min(1, 'name is required'),
      itemType: z.enum(['skill', 'feat', 'specialization', 'metatype']),
      description: z.string().optional(),
      system: z.record(z.unknown()).optional(),
      img: z.string().optional(),
      actorId: z.string().optional(),
      folderName: z.string().optional(),
    });
    const { name, itemType, description, system, img, actorId, folderName } = schema.parse(args);
    try {
      const payload: Record<string, unknown> = { name, itemType };
      if (description !== undefined) payload.description = description;
      if (system !== undefined && Object.keys(system).length > 0) payload.system = system;
      if (img !== undefined) payload.img = img;
      if (actorId !== undefined) payload.actorId = actorId;
      if (folderName !== undefined) payload.folderName = folderName;
      const result = await this.foundryClient.query('foundry-mcp-bridge.createSRA2Item', payload);
      this.logger.info('Created SRA2 item from content', { id: result.id, name: result.name, type: result.type, actorId: result.actorId });
      const where = result.actorId ? `on actor ${result.actorId}` : 'in world items';
      return {
        success: true,
        item: result,
        message: `Created SRA2 ${itemType}: **${result.name}** (id: ${result.id}) ${where}.`,
      };
    } catch (error) {
      this.errorHandler.handleToolError(error, 'create-sra2-item', 'SRA2 item creation');
    }
  }

  /**
   * Update SRA2 actor biography
   */
  async handleUpdateSRA2ActorBiography(args: any): Promise<any> {
    const schema = z.object({
      actorId: z.string().min(1, 'actorId is required'),
      biography: z.string().min(1, 'biography is required'),
    });
    const { actorId, biography } = schema.parse(args);
    try {
      const result = await this.foundryClient.query('foundry-mcp-bridge.updateSRA2ActorBiography', {
        actorId,
        biography,
      });
      this.logger.info('Updated SRA2 actor biography', { id: result.id, name: result.name });
      return {
        success: true,
        actor: result,
        message: `Bio mise à jour pour **${result.name}** (id: ${result.id}). Consulte la section Identity/Bio sur sa fiche.`,
      };
    } catch (error) {
      this.errorHandler.handleToolError(error, 'update-sra2-actor-biography', 'SRA2 biography update');
    }
  }

  /**
   * Import actors from Anarchy v1 export JSON (converted to SRA2). Reads file from filePath or uses jsonContent.
   */
  async handleImportActorsFromAnarchyExport(args: any): Promise<any> {
    let jsonContent: string;
    if (args.filePath && typeof args.filePath === 'string') {
      const filePath = String(args.filePath).trim();
      if (!filePath) throw new Error('filePath cannot be empty');
      try {
        jsonContent = fs.readFileSync(filePath, 'utf8');
      } catch (e) {
        throw new Error(`Cannot read file "${filePath}": ${e instanceof Error ? e.message : String(e)}`);
      }
    } else if (args.jsonContent && typeof args.jsonContent === 'string') {
      jsonContent = args.jsonContent;
    } else {
      throw new Error('Provide either filePath (path to export JSON file) or jsonContent (raw JSON string).');
    }
    const baseFolderPath = args.baseFolderPath != null ? String(args.baseFolderPath).trim() : undefined;
    try {
      const result = await this.foundryClient.query('foundry-mcp-bridge.importActorsFromAnarchyExport', {
        jsonContent,
        baseFolderPath,
      });
      this.logger.info('Import Anarchy export completed', { imported: result.imported, errors: result.errors?.length ?? 0 });
      const detailsList = result.details?.length
        ? result.details.map((d: { name: string; id: string; folderPath: string }) => `• ${d.name} (${d.id}) → ${d.folderPath}`).join('\n')
        : '';
      const errList = result.errors?.length ? `\nErreurs:\n${result.errors.map((e: string) => `• ${e}`).join('\n')}` : '';
      return {
        success: true,
        imported: result.imported,
        errors: result.errors ?? [],
        details: result.details ?? [],
        message: `Import terminé: ${result.imported} acteur(s) créé(s).${errList}${detailsList ? `\n\nActeurs:\n${detailsList}` : ''}`,
      };
    } catch (error) {
      this.errorHandler.handleToolError(error, 'import-actors-from-anarchy-export', 'Anarchy→SRA2 import');
    }
  }

  /**
   * Format compendium entry response
   */
  private formatCompendiumEntryResponse(entry: any): any {
    const itemsInfo = entry.items?.length > 0 
      ? `\n📦 Items: ${entry.items.map((item: any) => item.name).join(', ')}`
      : '';
    
    const effectsInfo = entry.effects?.length > 0
      ? `\n✨ Effects: ${entry.effects.map((effect: any) => effect.name).join(', ')}`
      : '';

    return {
      name: entry.name,
      type: entry.type,
      pack: entry.packLabel,
      system: entry.system,
      fullData: entry.fullData,
      items: entry.items || [],
      effects: entry.effects || [],
      summary: `📊 **${entry.name}** (${entry.type} from ${entry.packLabel})${itemsInfo}${effectsInfo}`,
    };
  }

  /**
   * Format simplified actor creation response
   */
  private formatSimpleActorCreationResponse(result: any, packId: string, itemId: string, customNames: string[]): any {
    const summary = `✅ Created ${result.totalCreated} of ${result.totalRequested} requested actors`;
    
    const details = result.actors.map((actor: any) => 
      `• **${actor.name}** (from ${packId})`
    ).join('\n');

    const sceneInfo = result.tokensPlaced > 0 
      ? `\n🎯 Added ${result.tokensPlaced} tokens to the current scene`
      : '';

    const errorInfo = result.errors?.length > 0
      ? `\n⚠️ Issues: ${result.errors.join(', ')}`
      : '';

    return {
      summary,
      success: result.success,
      details: {
        actors: result.actors,
        sourceEntry: {
          packId,
          itemId,
        },
        tokensPlaced: result.tokensPlaced || 0,
        errors: result.errors,
      },
      message: summary + '\n\n' + details + sceneInfo + errorInfo,
    };
  }
}