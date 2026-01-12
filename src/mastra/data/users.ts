/**
 * V-Inference Data Layer - Users
 * Mastra KV storage operations for users
 */

import { mastra } from '../../../mastra.config';
import { User } from '../types';
import { v4 as uuidv4 } from 'uuid';

const USERS_PREFIX = 'users:';
const USERS_BY_WALLET_PREFIX = 'users:wallet:';

export async function createUser(userData: {
    wallet_address: string;
    username?: string;
}): Promise<User> {
    const user: User = {
        id: uuidv4(),
        wallet_address: userData.wallet_address,
        username: userData.username,
        balance: 1000.0, // Mock balance for demo
        created_at: new Date().toISOString(),
    };

    // Store user by ID
    await mastra.storage?.set(`${USERS_PREFIX}${user.id}`, JSON.stringify(user));

    // Store wallet -> user ID mapping
    await mastra.storage?.set(`${USERS_BY_WALLET_PREFIX}${user.wallet_address}`, user.id);

    return user;
}

export async function getUser(userId: string): Promise<User | null> {
    const data = await mastra.storage?.get(`${USERS_PREFIX}${userId}`);
    return data ? JSON.parse(data) : null;
}

export async function getUserByWallet(walletAddress: string): Promise<User | null> {
    const userId = await mastra.storage?.get(`${USERS_BY_WALLET_PREFIX}${walletAddress}`);
    if (!userId) return null;
    return getUser(userId);
}

export async function getOrCreateUser(walletAddress: string): Promise<User> {
    const existing = await getUserByWallet(walletAddress);
    if (existing) return existing;

    return createUser({ wallet_address: walletAddress });
}

export async function updateUserBalance(userId: string, newBalance: number): Promise<User | null> {
    const user = await getUser(userId);
    if (!user) return null;

    user.balance = newBalance;
    await mastra.storage?.set(`${USERS_PREFIX}${userId}`, JSON.stringify(user));

    return user;
}
