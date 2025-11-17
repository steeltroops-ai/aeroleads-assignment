'use client';

/**
 * Post Editor Client Component
 * 
 * Provides editing interface with:
 * - Live markdown preview
 * - Content regeneration
 * - Metadata editing
 * - Save and publish controls
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BlogPost } from '@/lib/storage';
import { remark } from 'remark';
import html from 'remark-html';
import { extractTableOfContents, type TOCItem } from '@/lib/markdown';
import TableOfContents from '@/app/blog/[slug]/TableOfContents';
import Navigation from '@/components/Navigation';

interface EditorClientProps {
    post: BlogPost;
}

export default function EditorClient({ post: initialPost }: EditorClientProps) {
    const router = useRouter();
    const [post, setPost] = useState(initialPost);
    const [title, setTitle] = useState(initialPost.title);
    const [content, setContent] = useState(initialPost.content);
    const [description, setDescription] = useState(initialPost.description || '');
    const [tags, setTags] = useState(initialPost.tags?.join(', ') || '');
    const [author, setAuthor] = useState(initialPost.author || '');
    const [isPreview, setIsPreview] = useState(false);
    const [previewHtml, setPreviewHtml] = useState('');
    const [previewToc, setPreviewToc] = useState<TOCItem[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 5000);
    };

    const handlePreview = async () => {
        if (!isPreview) {
            try {
                const result = await remark().use(html).process(content);
                setPreviewHtml(result.toString());
                // Extract table of contents
                const toc = extractTableOfContents(content);
                setPreviewToc(toc);
            } catch (error) {
                showMessage('error', 'Failed to generate preview');
                return;
            }
        }
        setIsPreview(!isPreview);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await fetch(`/api/posts/${post.slug}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    content,
                    description,
                    tags: tags.split(',').map(t => t.trim()).filter(t => t),
                    author: author || undefined,
                }),
            });

            const data = await response.json();
            if (data.success) {
                setPost(data.post);
                showMessage('success', 'Post saved successfully');
            } else {
                showMessage('error', data.error || 'Failed to save post');
            }
        } catch (error) {
            showMessage('error', 'Failed to save post');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePublish = async () => {
        setIsSaving(true);
        try {
            // First save the content
            await handleSave();

            // Then publish
            const response = await fetch(`/api/posts/${post.slug}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ published: true }),
            });

            const data = await response.json();
            if (data.success) {
                setPost(data.post);
                showMessage('success', 'Post published successfully');
                setTimeout(() => router.push('/manage'), 1500);
            } else {
                showMessage('error', data.error || 'Failed to publish post');
            }
        } catch (error) {
            showMessage('error', 'Failed to publish post');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRegenerate = async () => {
        if (!confirm('Are you sure you want to regenerate this post? Current content will be replaced.')) {
            return;
        }

        const tone = prompt('Enter tone (professional, casual, technical):', 'professional');
        if (!tone || !['professional', 'casual', 'technical'].includes(tone)) {
            showMessage('error', 'Invalid tone');
            return;
        }

        const length = prompt('Enter length (short, medium, long):', 'medium');
        if (!length || !['short', 'medium', 'long'].includes(length)) {
            showMessage('error', 'Invalid length');
            return;
        }

        setIsRegenerating(true);
        try {
            const response = await fetch(`/api/posts/${post.slug}/regenerate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tone, length }),
            });

            const data = await response.json();
            if (data.success) {
                setPost(data.post);
                setContent(data.post.content);
                showMessage('success', 'Post regenerated successfully');
            } else {
                showMessage('error', data.error || 'Failed to regenerate post');
            }
        } catch (error) {
            showMessage('error', 'Failed to regenerate post');
        } finally {
            setIsRegenerating(false);
        }
    };

    const hasChanges =
        title !== post.title ||
        content !== post.content ||
        description !== (post.description || '') ||
        tags !== (post.tags?.join(', ') || '') ||
        author !== (post.author || '');

    return (
        <>
            <Navigation pageTitle="Edit Post" />

            <div className="min-h-screen bg-black">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Page Header */}
                    <div className="mb-8">
                        <div className="flex flex-col gap-6">
                            {/* Title Row */}
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-3xl font-bold text-zinc-50">
                                    {title || 'Untitled Post'}
                                </h1>
                                <span className={`px-3 py-1 text-xs font-medium rounded-full ${post.published
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                    }`}>
                                    {post.published ? 'Published' : 'Draft'}
                                </span>
                                {hasChanges && (
                                    <span className="text-sm text-zinc-400">
                                        • Unsaved changes
                                    </span>
                                )}
                            </div>

                            {/* Action Buttons Row */}
                            <div className="flex items-center gap-3 flex-wrap">
                                <button
                                    onClick={handleRegenerate}
                                    disabled={isRegenerating || isSaving}
                                    className="px-5 py-2.5 bg-zinc-800 text-zinc-50 rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                                >
                                    {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                                </button>
                                <button
                                    onClick={handlePreview}
                                    className="px-5 py-2.5 border border-zinc-700 text-zinc-50 rounded-lg hover:bg-zinc-800 transition-colors text-sm font-medium"
                                >
                                    {isPreview ? 'Edit' : 'Preview'}
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving || !hasChanges}
                                    className="px-5 py-2.5 bg-white text-black rounded-lg hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                                >
                                    {isSaving ? 'Saving...' : 'Save'}
                                </button>
                                {!post.published && (
                                    <button
                                        onClick={handlePublish}
                                        disabled={isSaving}
                                        className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                                    >
                                        Publish
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Message Banner */}
                        {message && (
                            <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${message.type === 'success'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
                                }`}>
                                {message.type === 'success' ? (
                                    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                )}
                                {message.text}
                            </div>
                        )}
                    </div>

                    {isPreview ? (
                        /* Preview Mode - Matches blog reading page exactly */
                        <div className="max-w-7xl mx-auto">
                            {/* Preview Banner */}
                            <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                        Preview Mode - This is how your post will appear to readers
                                    </span>
                                </div>
                                <button
                                    onClick={handlePreview}
                                    className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm font-medium"
                                >
                                    Back to Edit
                                </button>
                            </div>

                            <div className="flex flex-col lg:flex-row gap-8 justify-center">
                                {/* Main Content */}
                                <article className="flex-1 max-w-4xl bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 lg:p-12">
                                    {/* Article Header */}
                                    <header className="mb-8 pb-8 border-b border-zinc-200 dark:border-zinc-800">
                                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-black dark:text-zinc-50 mb-4">
                                            {title}
                                        </h1>

                                        {description && (
                                            <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-4">{description}</p>
                                        )}

                                        <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
                                            {author && (
                                                <span className="flex items-center">
                                                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                                    </svg>
                                                    {author}
                                                </span>
                                            )}

                                            <time className="flex items-center">
                                                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                                </svg>
                                                {new Date(post.updatedAt).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                })}
                                            </time>

                                            {tags && tags.trim() && (
                                                <div className="flex flex-wrap gap-2">
                                                    {tags.split(',').map((tag, index) => {
                                                        const tagColors = [
                                                            'bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
                                                            'bg-stone-100 dark:bg-stone-800/50 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700',
                                                            'bg-neutral-100 dark:bg-neutral-800/50 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700'
                                                        ];
                                                        return (
                                                            <span key={tag.trim()} className={`px-2.5 py-1 rounded text-xs font-medium ${tagColors[index % tagColors.length]}`}>
                                                                {tag.trim()}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </header>

                                    {/* Article Content */}
                                    <div
                                        className="prose prose-lg max-w-none dark:prose-invert"
                                        dangerouslySetInnerHTML={{ __html: previewHtml }}
                                    />
                                </article>

                                {/* Sidebar - Table of Contents */}
                                {previewToc.length > 0 && (
                                    <aside className="hidden lg:block w-64 flex-shrink-0">
                                        <div className="sticky top-8">
                                            <TableOfContents items={previewToc} />
                                        </div>
                                    </aside>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Edit Mode */
                        <div className="space-y-6">
                            {/* Metadata */}
                            <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
                                <h2 className="text-lg font-semibold text-zinc-50 mb-4">Metadata</h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                                            Title
                                        </label>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            className="w-full px-4 py-2 border border-zinc-700 bg-zinc-800 text-zinc-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                                            Description
                                        </label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            rows={2}
                                            className="w-full px-4 py-2 border border-zinc-700 bg-zinc-800 text-zinc-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-50 resize-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-300 mb-2">
                                                Tags
                                            </label>
                                            <input
                                                type="text"
                                                value={tags}
                                                onChange={(e) => setTags(e.target.value)}
                                                placeholder="typescript, react, nextjs"
                                                className="w-full px-4 py-2 border border-zinc-700 bg-zinc-800 text-zinc-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-300 mb-2">
                                                Author
                                            </label>
                                            <input
                                                type="text"
                                                value={author}
                                                onChange={(e) => setAuthor(e.target.value)}
                                                className="w-full px-4 py-2 border border-zinc-700 bg-zinc-800 text-zinc-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-50"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Content Editor */}
                            <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
                                <h2 className="text-lg font-semibold text-zinc-50 mb-4">Content</h2>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    rows={25}
                                    className="w-full px-4 py-2 border border-zinc-700 bg-zinc-800 text-zinc-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-50 font-mono text-sm"
                                    placeholder="Write your markdown content here..."
                                />
                                <p className="mt-2 text-sm text-zinc-400">
                                    Markdown supported: **bold**, *italic*, `code`, ## headings
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
