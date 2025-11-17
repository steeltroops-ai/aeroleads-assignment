/**
 * Bulk Operations API
 * 
 * POST /api/posts/bulk - Perform bulk operations on multiple posts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createStorageClientFromEnv, BlogPost } from '@/lib/storage';

interface BulkRequest {
    operation: 'publish' | 'unpublish' | 'delete';
    slugs: string[];
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const body: BulkRequest = await request.json();

        if (!body.operation || !body.slugs) {
            return NextResponse.json(
                { success: false, error: 'operation and slugs are required' },
                { status: 400 }
            );
        }

        if (!['publish', 'unpublish', 'delete'].includes(body.operation)) {
            return NextResponse.json(
                { success: false, error: 'Invalid operation. Must be: publish, unpublish, or delete' },
                { status: 400 }
            );
        }

        if (!Array.isArray(body.slugs) || body.slugs.length === 0) {
            return NextResponse.json(
                { success: false, error: 'slugs must be a non-empty array' },
                { status: 400 }
            );
        }

        const storageClient = createStorageClientFromEnv();
        const results: Array<{ slug: string; status: 'success' | 'error'; error?: string }> = [];

        for (const slug of body.slugs) {
            try {
                if (body.operation === 'delete') {
                    await storageClient.deletePost(slug);
                    results.push({ slug, status: 'success' });
                } else {
                    const post = await storageClient.readPost(slug);
                    const updatedPost: BlogPost = {
                        ...post,
                        published: body.operation === 'publish',
                        updatedAt: new Date(),
                    };
                    await storageClient.writePost(slug, updatedPost);
                    results.push({ slug, status: 'success' });
                }
            } catch (error) {
                results.push({
                    slug,
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        const successCount = results.filter(r => r.status === 'success').length;
        const errorCount = results.filter(r => r.status === 'error').length;

        return NextResponse.json({
            success: successCount > 0,
            results,
            message: `${successCount} post(s) ${body.operation}${body.operation === 'publish' || body.operation === 'unpublish' ? 'ed' : 'd'} successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
        });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to perform bulk operation'
            },
            { status: 500 }
        );
    }
}
