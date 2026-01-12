/**
 * V-Inference Mastra Routes - Marketplace
 * Marketplace endpoints
 */

import { Router } from 'express';
import { createListing, getActiveListings, getListing, getOwnerListings, updateListing, getUserPurchases } from '../data';
import { purchaseInferenceWorkflow, useMarketplaceInferenceWorkflow } from '../workflows';
import { getModel } from '../data';

export default (router: Router) => {
    // Create listing
    router.post('/api/marketplace/list', async (req, res) => {
        try {
            const { model_id, price_per_inference, description, category, tags, owner_id } = req.body;

            const model = await getModel(model_id);
            if (!model) {
                return res.status(404).json({
                    success: false,
                    message: 'Model not found',
                });
            }

            const listing = await createListing({
                model_id,
                owner_id,
                model_name: model.name,
                description: description || model.description || '',
                price_per_inference,
                category,
                tags,
            });

            res.json({
                success: true,
                message: 'Listing created successfully',
                data: listing,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });

    // Get listings
    router.get('/api/marketplace/listings', async (req, res) => {
        try {
            const { category, min_price, max_price } = req.query;

            let listings = await getActiveListings();

            if (category) {
                listings = listings.filter(l => l.category === category);
            }

            if (min_price) {
                listings = listings.filter(l => l.price_per_inference >= parseFloat(min_price as string));
            }

            if (max_price) {
                listings = listings.filter(l => l.price_per_inference <= parseFloat(max_price as string));
            }

            res.json({
                success: true,
                message: `Found ${listings.length} listings`,
                data: listings,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });

    // Get listing
    router.get('/api/marketplace/listings/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const listing = await getListing(id);
            if (!listing) {
                return res.status(404).json({
                    success: false,
                    message: 'Listing not found',
                });
            }

            res.json({
                success: true,
                message: 'Listing retrieved successfully',
                data: listing,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });

    // Purchase inference
    router.post('/api/marketplace/purchase', async (req, res) => {
        try {
            const { listing_id, inferences_count = 1, user_id } = req.body;

            const result = await purchaseInferenceWorkflow.execute({
                userId: user_id,
                listingId: listing_id,
                inferencesCount: inferences_count,
            });

            res.json({
                success: true,
                message: 'Purchase completed successfully',
                data: {
                    purchase_id: result.purchaseId,
                },
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });

    // Use purchased inference
    router.post('/api/marketplace/use/:purchaseId', async (req, res) => {
        try {
            const { purchaseId } = req.params;
            const { input_data } = req.body;

            const result = await useMarketplaceInferenceWorkflow.execute({
                purchaseId,
                inputData: input_data,
            });

            res.json({
                success: true,
                message: 'Inference completed successfully',
                data: result,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });

    // Get user purchases
    router.get('/api/marketplace/purchases', async (req, res) => {
        try {
            const { user_id } = req.query;

            if (!user_id) {
                return res.status(400).json({
                    success: false,
                    message: 'user_id is required',
                });
            }

            const purchases = await getUserPurchases(user_id as string);

            res.json({
                success: true,
                message: `Found ${purchases.length} purchases`,
                data: purchases,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });

    // Get my listings
    router.get('/api/marketplace/my-listings', async (req, res) => {
        try {
            const { owner_id } = req.query;

            if (!owner_id) {
                return res.status(400).json({
                    success: false,
                    message: 'owner_id is required',
                });
            }

            const listings = await getOwnerListings(owner_id as string);

            res.json({
                success: true,
                message: `Found ${listings.length} listings`,
                data: listings,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });

    // Update listing
    router.put('/api/marketplace/listings/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { price_per_inference, description, is_active } = req.body;

            const updates: any = {};
            if (price_per_inference !== undefined) updates.price_per_inference = price_per_inference;
            if (description !== undefined) updates.description = description;
            if (is_active !== undefined) updates.is_active = is_active;

            const listing = await updateListing(id, updates);

            res.json({
                success: true,
                message: 'Listing updated successfully',
                data: listing,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
};
