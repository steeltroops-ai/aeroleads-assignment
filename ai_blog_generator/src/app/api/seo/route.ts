/**
 * SEO Optimization API
 * 
 * POST /api/seo - Generate SEO suggestions for a post
 */

import { NextRequest, NextResponse } from 'next/server';
import { createStorageClientFromEnv } from '@/lib/storage';
import { createLLMClientFromEnv } from '@/lib/llm';
import { generateSEOSuggestions, generateSEOMetadata, validateSEOMetadata } from '@/lib/seo';

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const body = await request.json();
        const { slug } = body;

        if (!slug) {
            return NextResponse.json(
                { success: false, error: 'slug is required' },
                { status: 400 }
            );
        }

        const storageClient = createStorageClientFromEnv();
        const llmClient = createLLMClientFromEnv();
        const post = await storageClient.readPost(slug);

        // Generate SEO suggestions
        const suggestions = await generateSEOSuggestions(post, llmClient);

        // Generate current SEO metadata
        const baseUrl = process.env.BLOG_BASE_URL || 'http://localhost:3000';
        const metadata = generateSEOMetadata(post, baseUrl);

        // Validate metadata
        const validation = validateSEOMetadata(metadata);

        return NextResponse.json({
            success: true,
            suggestions,
            currentMetadata: metadata,
            validation,
        });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to generate SEO suggestions',
            },
            { status: 500 }
        );
    }
}
