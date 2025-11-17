/**
 * Post Editor Page
 * 
 * Provides a light editor interface for modifying post content before publishing
 */

import { createStorageClientFromEnv } from '@/lib/storage';
import { notFound } from 'next/navigation';
import EditorClient from './EditorClient';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ slug: string }>;
}

export default async function EditPostPage({ params }: PageProps) {
    const { slug } = await params;
    const storageClient = createStorageClientFromEnv();

    try {
        const post = await storageClient.readPost(slug);
        return <EditorClient post={post} />;
    } catch (error) {
        notFound();
    }
}
