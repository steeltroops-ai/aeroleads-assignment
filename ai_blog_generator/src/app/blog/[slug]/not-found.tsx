/**
 * 404 Not Found Page for Blog Posts
 */

import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="text-center">
                <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
                <h2 className="text-2xl font-semibold text-gray-700 mb-4">
                    Blog Post Not Found
                </h2>
                <p className="text-gray-600 mb-8">
                    The blog post you&apos;re looking for doesn&apos;t exist or has been removed.
                </p>
                <div className="space-x-4">
                    <Link
                        href="/blog"
                        className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        View All Posts
                    </Link>
                    <Link
                        href="/"
                        className="inline-block px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                        Go Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
