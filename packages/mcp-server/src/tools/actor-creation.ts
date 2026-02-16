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
        description: 'Create a new Shadowrun Anarchy 2 (SRA2) actor in the world: character, vehicle, or ICE. Only works when the active game system is SRA2. The actor is created with minimal data; you can then edit it in Foundry or add items with create-sra2-item.',
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
              description: 'Optional folder name to organize the actor (default: Foundry MCP SRA2)',
            },
            addToScene: {
              type: 'boolean',
              description: 'If true, add the new actor to the current scene as a token',
              default: false,
            },
            biography: {
              type: 'string',
              description: 'Optional description/biography for the character (stored in SRA2 "Bio" / Identity section, system.bio.background)',
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
    const schema = z.object({
      name: z.string().min(1, 'name is required'),
      actorType: z.enum(['character', 'vehicle', 'ice']),
      folderName: z.string().optional(),
      addToScene: z.boolean().default(false),
      biography: z.string().optional(),
    });
    const { name, actorType, folderName, addToScene, biography } = schema.parse(args);
    try {
      const result = await this.foundryClient.query('foundry-mcp-bridge.createSRA2Actor', {
        name,
        actorType,
        folderName,
        addToScene,
        ...(biography != null && biography !== '' ? { biography } : {}),
      });
      this.logger.info('Created SRA2 actor', { id: result.id, name: result.name, type: result.type });
      return {
        success: true,
        actor: result,
        message: `Created SRA2 ${actorType}: **${result.name}** (id: ${result.id}). Open the actor in Foundry to edit details.`,
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