/**
 * Posts List and Bulk Operations API
 * 
 * GET /api/posts - List all posts (published and unpublished)
 * POST /api/posts/bulk - Bulk operations (publish, unpublish, delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createStorageClientFromEnv } from '@/lib/storage';

// GET - List all posts
export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const { searchParams } = new URL(request.url);
        const published = searchParams.get('published');
        const sortBy = searchParams.get('sortBy') as 'createdAt' | 'updatedAt' | 'title' | null;
        const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | null;
        const limit = searchParams.get('limit');
        const offset = searchParams.get('offset');

        const storageClient = createStorageClientFromEnv();

        const posts = await storageClient.listPosts({
            published: published === 'true' ? true : published === 'false' ? false : undefined,
            sortBy: sortBy || 'createdAt',
            sortOrder: sortOrder || 'desc',
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : undefined,
        });

        return NextResponse.json({
            success: true,
            posts,
            count: posts.length,
        });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to list posts'
            },
            { status: 500 }
        );
    }
}
