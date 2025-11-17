/**
 * Social Sharing Component
 * 
 * Displays social media sharing buttons for blog posts
 */

'use client';

import { useState } from 'react';
import { BlogPost } from '@/lib/storage';
import { generateAllSharingLinks, SocialPlatform } from '@/lib/social-sharing';

interface SocialShareProps {
    post: BlogPost;
    baseUrl: string;
    platforms?: SocialPlatform[];
    className?: string;
}

export default function SocialShare({ post, baseUrl, platforms, className = '' }: SocialShareProps) {
    const [copied, setCopied] = useState(false);
    const sharingLinks = generateAllSharingLinks(post, baseUrl, platforms);

    const handleCopyLink = async () => {
        const url = `${baseUrl}/blog/${post.slug}`;
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy link:', error);
        }
    };

    const handleShare = (url: string, platform: string) => {
        // Track sharing event (could be sent to analytics)
        console.log(`Shared on ${platform}`);

        // Open sharing window
        window.open(url, '_blank', 'width=600,height=400');
    };

    return (
        <div className={`flex flex-col gap-4 ${className}`}>
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Share this article
            </h3>

            <div className="flex flex-wrap gap-2">
                {sharingLinks.map((link) => (
                    <button
                        key={link.platform}
                        onClick={() => handleShare(link.url, link.platform)}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors text-sm font-medium text-zinc-700 dark:text-zinc-300"
                        title={link.label}
                    >
                        <span className="text-lg">{link.icon}</span>
                        <span className="hidden sm:inline">{link.platform}</span>
                    </button>
                ))}

                <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-900/70 rounded-lg transition-colors text-sm font-medium text-blue-700 dark:text-blue-300"
                    title="Copy link"
                >
                    <span className="text-lg">{copied ? '✓' : '🔗'}</span>
                    <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy link'}</span>
                </button>
            </div>
        </div>
    );
}
