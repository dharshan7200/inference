/**
 * V-Inference Data Layer - Marketplace
 * Mastra KV storage operations for marketplace listings and purchases
 */

import { mastra } from '../../../mastra.config';
import { MarketplaceListing, Purchase, EscrowStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';

const LISTINGS_PREFIX = 'listings:';
const LISTINGS_BY_MODEL_PREFIX = 'listings:model:';
const LISTINGS_BY_OWNER_PREFIX = 'listings:owner:';
const ACTIVE_LISTINGS_KEY = 'listings:active';

const PURCHASES_PREFIX = 'purchases:';
const PURCHASES_BY_USER_PREFIX = 'purchases:user:';
const PURCHASES_BY_LISTING_PREFIX = 'purchases:listing:';

// Listings

export async function createListing(listingData: {
    model_id: string;
    owner_id: string;
    model_name: string;
    description: string;
    price_per_inference: number;
    category?: string;
    tags?: string[];
}): Promise<MarketplaceListing> {
    const listing: MarketplaceListing = {
        id: uuidv4(),
        model_id: listingData.model_id,
        owner_id: listingData.owner_id,
        model_name: listingData.model_name,
        description: listingData.description,
        price_per_inference: listingData.price_per_inference,
        is_active: true,
        total_inferences: 0,
        total_revenue: 0,
        rating: 5.0,
        category: listingData.category || 'general',
        tags: listingData.tags || [],
        created_at: new Date().toISOString(),
    };

    // Store listing by ID
    await mastra.storage?.set(`${LISTINGS_PREFIX}${listing.id}`, JSON.stringify(listing));

    // Store model -> listing mapping
    await mastra.storage?.set(`${LISTINGS_BY_MODEL_PREFIX}${listing.model_id}`, listing.id);

    // Add to owner's listings
    const ownerListings = await getOwnerListingIds(listing.owner_id);
    ownerListings.push(listing.id);
    await mastra.storage?.set(`${LISTINGS_BY_OWNER_PREFIX}${listing.owner_id}`, JSON.stringify(ownerListings));

    // Add to active listings
    const activeListings = await getActiveListingIds();
    activeListings.push(listing.id);
    await mastra.storage?.set(ACTIVE_LISTINGS_KEY, JSON.stringify(activeListings));

    return listing;
}

export async function getListing(listingId: string): Promise<MarketplaceListing | null> {
    const data = await mastra.storage?.get(`${LISTINGS_PREFIX}${listingId}`);
    return data ? JSON.parse(data) : null;
}

export async function getListingByModel(modelId: string): Promise<MarketplaceListing | null> {
    const listingId = await mastra.storage?.get(`${LISTINGS_BY_MODEL_PREFIX}${modelId}`);
    if (!listingId) return null;
    return getListing(listingId);
}

async function getActiveListingIds(): Promise<string[]> {
    const data = await mastra.storage?.get(ACTIVE_LISTINGS_KEY);
    return data ? JSON.parse(data) : [];
}

export async function getActiveListings(): Promise<MarketplaceListing[]> {
    const listingIds = await getActiveListingIds();
    const listings = await Promise.all(listingIds.map(id => getListing(id)));
    return listings.filter((l): l is MarketplaceListing => l !== null && l.is_active);
}

async function getOwnerListingIds(ownerId: string): Promise<string[]> {
    const data = await mastra.storage?.set(`${LISTINGS_BY_OWNER_PREFIX}${ownerId}`);
    return data ? JSON.parse(data) : [];
}

export async function getOwnerListings(ownerId: string): Promise<MarketplaceListing[]> {
    const listingIds = await getOwnerListingIds(ownerId);
    const listings = await Promise.all(listingIds.map(id => getListing(id)));
    return listings.filter((l): l is MarketplaceListing => l !== null);
}

export async function updateListing(listingId: string, updates: Partial<MarketplaceListing>): Promise<MarketplaceListing | null> {
    const listing = await getListing(listingId);
    if (!listing) return null;

    const updated = { ...listing, ...updates };
    await mastra.storage?.set(`${LISTINGS_PREFIX}${listingId}`, JSON.stringify(updated));

    // Update active listings if is_active changed
    if (updates.is_active !== undefined && updates.is_active !== listing.is_active) {
        const activeListings = await getActiveListingIds();
        if (updates.is_active) {
            activeListings.push(listingId);
        } else {
            const filtered = activeListings.filter(id => id !== listingId);
            await mastra.storage?.set(ACTIVE_LISTINGS_KEY, JSON.stringify(filtered));
            return updated;
        }
        await mastra.storage?.set(ACTIVE_LISTINGS_KEY, JSON.stringify(activeListings));
    }

    return updated;
}

// Purchases

export async function createPurchase(purchaseData: {
    user_id: string;
    listing_id: string;
    model_id: string;
    inferences_bought: number;
    total_paid: number;
}): Promise<Purchase> {
    const purchase: Purchase = {
        id: uuidv4(),
        user_id: purchaseData.user_id,
        listing_id: purchaseData.listing_id,
        model_id: purchaseData.model_id,
        inferences_bought: purchaseData.inferences_bought,
        inferences_remaining: purchaseData.inferences_bought,
        total_paid: purchaseData.total_paid,
        escrow_status: EscrowStatus.LOCKED,
        created_at: new Date().toISOString(),
    };

    // Store purchase by ID
    await mastra.storage?.set(`${PURCHASES_PREFIX}${purchase.id}`, JSON.stringify(purchase));

    // Add to user's purchases
    const userPurchases = await getUserPurchaseIds(purchase.user_id);
    userPurchases.push(purchase.id);
    await mastra.storage?.set(`${PURCHASES_BY_USER_PREFIX}${purchase.user_id}`, JSON.stringify(userPurchases));

    // Add to listing's purchases
    const listingPurchases = await getListingPurchaseIds(purchase.listing_id);
    listingPurchases.push(purchase.id);
    await mastra.storage?.set(`${PURCHASES_BY_LISTING_PREFIX}${purchase.listing_id}`, JSON.stringify(listingPurchases));

    return purchase;
}

export async function getPurchase(purchaseId: string): Promise<Purchase | null> {
    const data = await mastra.storage?.get(`${PURCHASES_PREFIX}${purchaseId}`);
    return data ? JSON.parse(data) : null;
}

async function getUserPurchaseIds(userId: string): Promise<string[]> {
    const data = await mastra.storage?.get(`${PURCHASES_BY_USER_PREFIX}${userId}`);
    return data ? JSON.parse(data) : [];
}

export async function getUserPurchases(userId: string): Promise<Purchase[]> {
    const purchaseIds = await getUserPurchaseIds(userId);
    const purchases = await Promise.all(purchaseIds.map(id => getPurchase(id)));
    return purchases.filter((p): p is Purchase => p !== null);
}

async function getListingPurchaseIds(listingId: string): Promise<string[]> {
    const data = await mastra.storage?.get(`${PURCHASES_BY_LISTING_PREFIX}${listingId}`);
    return data ? JSON.parse(data) : [];
}

export async function getPurchaseByUserAndListing(userId: string, listingId: string): Promise<Purchase | null> {
    const userPurchases = await getUserPurchases(userId);
    return userPurchases.find(p => p.listing_id === listingId) || null;
}

export async function updatePurchase(purchaseId: string, updates: Partial<Purchase>): Promise<Purchase | null> {
    const purchase = await getPurchase(purchaseId);
    if (!purchase) return null;

    const updated = { ...purchase, ...updates };
    await mastra.storage?.set(`${PURCHASES_PREFIX}${purchaseId}`, JSON.stringify(updated));

    return updated;
}
