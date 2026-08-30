import { getStoredInventory, saveStoredInventory } from '../lib/supabase';
import { ShopItem } from '../types/database';
import { authService } from './authService';

export const SHOP_CATALOG: ShopItem[] = [
  // Dice Skins
  {
    id: 'dice_gold',
    name: 'Imperial Gold Dice',
    type: 'dice',
    price: 0,
    icon: 'dice-6',
    previewColor: '#eab308',
    description: 'The standard issue die of the Royal Court.',
    rarity: 'common',
  },
  {
    id: 'dice_ruby',
    name: 'Ruby Dragon Dice',
    type: 'dice',
    price: 800,
    icon: 'dice-6',
    previewColor: '#ef4444',
    description: 'Forged from deep volcanic fire and polished dragon scales.',
    rarity: 'rare',
  },
  {
    id: 'dice_sapphire',
    name: 'Celestial Sapphire Dice',
    type: 'dice',
    price: 1500,
    icon: 'dice-6',
    previewColor: '#3b82f6',
    description: 'Imbued with starlight and crystalline luminescence.',
    rarity: 'epic',
  },
  {
    id: 'dice_obsidian',
    name: 'Shadow Obsidian Dice',
    type: 'dice',
    price: 3000,
    icon: 'dice-6',
    previewColor: '#a855f7',
    description: 'Shrouded in void shadows with glowing purple numerals.',
    rarity: 'legendary',
  },

  // Board Themes
  {
    id: 'theme_royal',
    name: 'Royal Mahogany Board',
    type: 'board',
    price: 0,
    icon: 'layout-grid',
    previewColor: '#78350f',
    description: 'Rich dark wood framed by intricate golden filigree.',
    rarity: 'common',
  },
  {
    id: 'theme_marble',
    name: 'Palace White Marble',
    type: 'board',
    price: 1200,
    icon: 'layout-grid',
    previewColor: '#e2e8f0',
    description: 'Polished Italian Carrara marble with gold inlay paths.',
    rarity: 'rare',
  },
  {
    id: 'theme_emerald_citadel',
    name: 'Emerald Citadel',
    type: 'board',
    price: 2400,
    icon: 'layout-grid',
    previewColor: '#065f46',
    description: 'Enchanted deep green malachite stone surface.',
    rarity: 'epic',
  },
  {
    id: 'theme_celestial_void',
    name: 'Celestial Void',
    type: 'board',
    price: 4500,
    icon: 'layout-grid',
    previewColor: '#1e1b4b',
    description: 'A deep cosmic board illuminated by floating nebula stardust.',
    rarity: 'legendary',
  },

  // Token Skins
  {
    id: 'token_royal',
    name: 'Royal Crown Tokens',
    type: 'token',
    price: 0,
    icon: 'shield',
    previewColor: '#eab308',
    description: 'Classic crowned monarch tokens.',
    rarity: 'common',
  },
  {
    id: 'token_gem',
    name: 'Faceted Gem Tokens',
    type: 'token',
    price: 1000,
    icon: 'sparkles',
    previewColor: '#ec4899',
    description: 'Sparkling precision-cut gemstones.',
    rarity: 'rare',
  },
  {
    id: 'token_phoenix',
    name: 'Phoenix Seal Tokens',
    type: 'token',
    price: 2500,
    icon: 'flame',
    previewColor: '#f97316',
    description: 'Blazing phoenix crest with fiery aura.',
    rarity: 'legendary',
  },

  // Avatars
  {
    id: 'avatar_1',
    name: 'Crown Monarch',
    type: 'avatar',
    price: 0,
    icon: 'user',
    description: 'The standard regal monarch portrait.',
    rarity: 'common',
  },
  {
    id: 'avatar_2',
    name: 'High Sorceress',
    type: 'avatar',
    price: 600,
    icon: 'user-check',
    description: 'Master of probability and celestial dice.',
    rarity: 'rare',
  },
  {
    id: 'avatar_3',
    name: 'Knight Commander',
    type: 'avatar',
    price: 1200,
    icon: 'shield-alert',
    description: 'Veteran of a hundred board conquests.',
    rarity: 'rare',
  },
  {
    id: 'avatar_4',
    name: 'Empress of Light',
    type: 'avatar',
    price: 2000,
    icon: 'sun',
    description: 'Ruler of the celestial empire.',
    rarity: 'epic',
  },

  // Avatar Frames
  {
    id: 'frame_none',
    name: 'Simple Border',
    type: 'frame',
    price: 0,
    icon: 'circle',
    description: 'Standard subtle frame.',
    rarity: 'common',
  },
  {
    id: 'frame_gold_laurel',
    name: 'Golden Laurel Frame',
    type: 'frame',
    price: 800,
    icon: 'award',
    previewColor: '#eab308',
    description: 'Wreathed in champion golden laurel leaves.',
    rarity: 'rare',
  },
  {
    id: 'frame_royal_crown',
    name: 'Imperial Crown Frame',
    type: 'frame',
    price: 1800,
    icon: 'crown',
    previewColor: '#f59e0b',
    description: 'Adorned with ruby and gold crown spikes.',
    rarity: 'epic',
  },
  {
    id: 'frame_draconic_aura',
    name: 'Draconic Flame Frame',
    type: 'frame',
    price: 3500,
    icon: 'flame',
    previewColor: '#ef4444',
    description: 'Radiating eternal dragonfire animation.',
    rarity: 'legendary',
  },
];

class ShopService {
  public getCatalog(): ShopItem[] {
    return SHOP_CATALOG;
  }

  public getOwnedItems(): string[] {
    return getStoredInventory();
  }

  public buyItem(itemId: string): { success: boolean; message: string } {
    const item = SHOP_CATALOG.find((i) => i.id === itemId);
    if (!item) return { success: false, message: 'Item not found in catalog' };

    const owned = this.getOwnedItems();
    if (owned.includes(itemId)) {
      return { success: false, message: 'You already own this item' };
    }

    const user = authService.getCurrentUser();
    if (user.coins < item.price) {
      return { success: false, message: `Insufficient coins (Need ${item.price} coins)` };
    }

    // Deduct coins & add to inventory
    authService.addCoinsAndXp(-item.price, 0);
    const updated = [...owned, itemId];
    saveStoredInventory(updated);

    return { success: true, message: `Successfully acquired ${item.name}!` };
  }

  public equipItem(itemId: string): boolean {
    const item = SHOP_CATALOG.find((i) => i.id === itemId);
    if (!item) return false;

    const owned = this.getOwnedItems();
    if (!owned.includes(itemId)) return false;

    if (item.type === 'dice') authService.updateProfile({ dice_skin: itemId });
    if (item.type === 'board') authService.updateProfile({ board_theme: itemId });
    if (item.type === 'token') authService.updateProfile({ token_skin: itemId });
    if (item.type === 'avatar') authService.updateProfile({ avatar_url: itemId });
    if (item.type === 'frame') authService.updateProfile({ avatar_frame: itemId });

    return true;
  }
}

export const shopService = new ShopService();
