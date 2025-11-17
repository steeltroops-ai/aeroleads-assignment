/**
 * Create New Blog Post Page
 * 
 * Interface for generating new blog posts using AI
 */

import Navigation from '@/components/Navigation';
import CreateBlogClient from './CreateBlogClient';

export const dynamic = 'force-dynamic';

export default function CreateBlogPage() {
    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black">
            <Navigation pageTitle="New Post" />
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <CreateBlogClient />
            </div>
        </div>
    );
}
