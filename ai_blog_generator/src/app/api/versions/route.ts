/**
 * Version History API
 * 
 * GET /api/versions?slug=xxx - Get version history for a post
 * POST /api/versions - Create a new version
 * PUT /api/versions - Restore a specific version
 */

import { NextRequest, NextResponse } from 'next/server';
import { createStorageClientFromEnv } from '@/lib/storage';
import { createVersioningClient } from '@/lib/versioning';

// GET - Get version history
export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const { searchParams } = new URL(request.url);
        const slug = searchParams.get('slug');

        if (!slug) {
            return NextResponse.json(
                { success: false, error: 'slug is required' },
                { status: 400 }
            );
        }

        const versioningClient = createVersioningClient();
        const revisions = await versioningClient.getRevisions(slug);
        const stats = await versioningClient.getVersionStats(slug);

        return NextResponse.json({
            success: true,
            revisions,
            stats,
        });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get version history',
            },
            { status: 500 }
        );
    }
}

// POST - Create a new version
export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const body = await request.json();
        const { slug, changeNote } = body;

        if (!slug) {
            return NextResponse.json(
                { success: false, error: 'slug is required' },
                { status: 400 }
            );
        }

        const storageClient = createStorageClientFromEnv();
        const versioningClient = createVersioningClient();

        const post = await storageClient.readPost(slug);
        const version = await versioningClient.createRevision(post, changeNote);

        return NextResponse.json({
            success: true,
            version,
            message: `Version ${version} created successfully`,
        });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create version',
            },
            { status: 500 }
        );
    }
}

// PUT - Restore a specific version
export async function PUT(request: NextRequest): Promise<NextResponse> {
    try {
        const body = await request.json();
        const { slug, version } = body;

        if (!slug || !version) {
            return NextResponse.json(
                { success: false, error: 'slug and version are required' },
                { status: 400 }
            );
        }

        const storageClient = createStorageClientFromEnv();
        const versioningClient = createVersioningClient();

        const revision = await versioningClient.restoreVersion(slug, version);

        if (!revision) {
            return NextResponse.json(
                { success: false, error: 'Version not found' },
                { status: 404 }
            );
        }

        // Update the post with restored content
        const post = await storageClient.readPost(slug);
        post.content = revision.content;
        post.title = revision.title;
        post.description = revision.description;
        post.tags = revision.tags;
        post.updatedAt = new Date();

        await storageClient.writePost(slug, post);

        return NextResponse.json({
            success: true,
            message: `Restored to version ${version}`,
            revision,
        });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to restore version',
            },
            { status: 500 }
        );
    }
}
