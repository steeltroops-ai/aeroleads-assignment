/**
 * Individual Post Management API
 * 
 * GET /api/posts/[slug] - Get post details
 * PUT /api/posts/[slug] - Update post content
 * DELETE /api/posts/[slug] - Delete post
 * PATCH /api/posts/[slug] - Update post metadata (publish/unpublish)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createStorageClientFromEnv, BlogPost, PostNotFoundError } from '@/lib/storage';

interface RouteContext {
    params: Promise<{ slug: string }>;
}

// GET - Retrieve post
export async function GET(
    request: NextRequest,
    context: RouteContext
): Promise<NextResponse> {
    try {
        const { slug } = await context.params;
        const storageClient = createStorageClientFromEnv();

        const post = await storageClient.readPost(slug);

        return NextResponse.json({
            success: true,
            post,
        });
    } catch (error) {
        if (error instanceof PostNotFoundError) {
            return NextResponse.json(
                { success: false, error: 'Post not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to retrieve post'
            },
            { status: 500 }
        );
    }
}

// PUT - Update post content
export async function PUT(
    request: NextRequest,
    context: RouteContext
): Promise<NextResponse> {
    try {
        const { slug } = await context.params;
        const body = await request.json();

        if (!body.content && !body.title) {
            return NextResponse.json(
                { success: false, error: 'Content or title is required' },
                { status: 400 }
            );
        }

        const storageClient = createStorageClientFromEnv();
        const existingPost = await storageClient.readPost(slug);

        const updatedPost: BlogPost = {
            ...existingPost,
            ...(body.title && { title: body.title }),
            ...(body.content && { content: body.content }),
            ...(body.description && { description: body.description }),
            ...(body.tags && { tags: body.tags }),
            ...(body.author && { author: body.author }),
            updatedAt: new Date(),
        };

        await storageClient.writePost(slug, updatedPost);

        return NextResponse.json({
            success: true,
            post: updatedPost,
            message: 'Post updated successfully',
        });
    } catch (error) {
        if (error instanceof PostNotFoundError) {
            return NextResponse.json(
                { success: false, error: 'Post not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update post'
            },
            { status: 500 }
        );
    }
}

// PATCH - Update post metadata (publish/unpublish)
export async function PATCH(
    request: NextRequest,
    context: RouteContext
): Promise<NextResponse> {
    try {
        const { slug } = await context.params;
        const body = await request.json();

        if (body.published === undefined) {
            return NextResponse.json(
                { success: false, error: 'published field is required' },
                { status: 400 }
            );
        }

        const storageClient = createStorageClientFromEnv();
        const existingPost = await storageClient.readPost(slug);

        const updatedPost: BlogPost = {
            ...existingPost,
            published: body.published,
            updatedAt: new Date(),
        };

        await storageClient.writePost(slug, updatedPost);

        return NextResponse.json({
            success: true,
            post: updatedPost,
            message: `Post ${body.published ? 'published' : 'unpublished'} successfully`,
        });
    } catch (error) {
        if (error instanceof PostNotFoundError) {
            return NextResponse.json(
                { success: false, error: 'Post not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update post status'
            },
            { status: 500 }
        );
    }
}

// DELETE - Delete post
export async function DELETE(
    request: NextRequest,
    context: RouteContext
): Promise<NextResponse> {
    try {
        const { slug } = await context.params;
        const storageClient = createStorageClientFromEnv();

        await storageClient.deletePost(slug);

        return NextResponse.json({
            success: true,
            message: 'Post deleted successfully',
        });
    } catch (error) {
        if (error instanceof PostNotFoundError) {
            return NextResponse.json(
                { success: false, error: 'Post not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete post'
            },
            { status: 500 }
        );
    }
}
