/**
 * Content Quality Analysis API
 * 
 * POST /api/quality - Analyze content quality and get improvement suggestions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createStorageClientFromEnv } from '@/lib/storage';
import { createLLMClientFromEnv } from '@/lib/llm';
import { analyzeContentQuality, generateImprovementPrompt } from '@/lib/content-quality';

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
        const post = await storageClient.readPost(slug);

        // Analyze quality
        const report = analyzeContentQuality(post);

        return NextResponse.json({
            success: true,
            report,
        });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to analyze quality',
            },
            { status: 500 }
        );
    }
}

// POST /api/quality/improve - Generate improved version
export async function PUT(request: NextRequest): Promise<NextResponse> {
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

        // Analyze quality
        const report = analyzeContentQuality(post);

        // Generate improvement prompt
        const prompt = generateImprovementPrompt(post, report);

        // Generate improved content
        const response = await llmClient.generateContent(prompt, {
            temperature: 0.7,
            maxTokens: 3000,
        });

        return NextResponse.json({
            success: true,
            improvedContent: response.content,
            originalReport: report,
        });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to improve content',
            },
            { status: 500 }
        );
    }
}
