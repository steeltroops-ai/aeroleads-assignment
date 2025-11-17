'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HiSparkles, HiArrowLeft, HiChevronDown, HiChevronRight, HiInformationCircle } from 'react-icons/hi';
import Link from 'next/link';

export default function CreateBlogClient() {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [toneType, setToneType] = useState<'basic' | 'mbti'>('basic');
    const [tone, setTone] = useState<string>('professional');
    const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');
    const [authorType, setAuthorType] = useState<'user' | 'ai' | 'custom'>('ai');
    const [customAuthor, setCustomAuthor] = useState('');
    const [provider, setProvider] = useState<'default' | 'perplexity'>('default');
    const [publish, setPublish] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 5000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim()) {
            showMessage('error', 'Please enter a blog topic');
            return;
        }

        setIsGenerating(true);

        try {
            // Determine author
            let authorName: string | undefined;
            if (authorType === 'user') {
                authorName = 'User';
            } else if (authorType === 'ai') {
                authorName = 'AI Assistant';
            } else if (authorType === 'custom' && customAuthor.trim()) {
                authorName = customAuthor.trim();
            }

            // Generate blog post (AI will create title + content together)
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    titles: [title.trim()],
                    tone,
                    length,
                    tags: [],
                    author: authorName,
                    publish,
                    provider: provider === 'perplexity' ? 'perplexity' : undefined,
                    autoGenerateTags: true,
                }),
            });

            const data = await response.json();

            if (data.success && data.posts && data.posts[0].status === 'success') {
                showMessage('success', 'Blog post generated with optimized title!');
                setTimeout(() => {
                    router.push(`/manage/edit/${data.posts[0].slug}`);
                }, 1500);
            } else {
                const errorMsg = data.posts?.[0]?.error || data.error || 'Failed to generate blog post';
                showMessage('error', errorMsg);
            }
        } catch (error) {
            showMessage('error', 'Failed to generate blog post. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <Link
                    href="/manage"
                    className="inline-flex items-center text-sm text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-50 mb-4 transition-colors"
                >
                    <HiArrowLeft className="w-4 h-4 mr-1.5" />
                    Back
                </Link>
                <h1 className="text-2xl font-bold text-black dark:text-zinc-50">
                    Create New Post
                </h1>
            </div>

            {/* Message Banner */}
            {message && (
                <div className={`mb-6 p-3 rounded-lg border text-sm ${message.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
                    }`}>
                    {message.text}
                </div>
            )}

            {/* Form Card */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 shadow-sm">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Title */}
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-black dark:text-zinc-50 mb-2">
                            Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter your blog post title"
                            className="w-full px-4 py-3 text-base bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-black dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
                            required
                        />
                    </div>

                    {/* Main Settings Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Column */}
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="length" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                    Length
                                </label>
                                <select
                                    id="length"
                                    value={length}
                                    onChange={(e) => setLength(e.target.value as any)}
                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
                                >
                                    <option value="short">Short (~3000 words)</option>
                                    <option value="medium">Medium (~6000 words)</option>
                                    <option value="long">Long (~12000 words)</option>
                                </select>
                            </div>

                            <div>
                                <label htmlFor="authorType" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                    Author
                                </label>
                                <select
                                    id="authorType"
                                    value={authorType}
                                    onChange={(e) => setAuthorType(e.target.value as any)}
                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
                                >
                                    <option value="ai">AI Assistant</option>
                                    <option value="user">User Profile</option>
                                    <option value="custom">Custom Name</option>
                                </select>
                            </div>

                            {authorType === 'custom' && (
                                <input
                                    type="text"
                                    value={customAuthor}
                                    onChange={(e) => setCustomAuthor(e.target.value)}
                                    placeholder="Enter author name"
                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-black dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
                                />
                            )}

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={publish}
                                    onChange={(e) => setPublish(e.target.checked)}
                                    className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700"
                                />
                                <span className="text-sm text-zinc-700 dark:text-zinc-300">Publish immediately</span>
                            </label>
                        </div>

                        {/* Right Column - Writing Tone */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    Tone
                                </label>
                                <div className="flex gap-3">
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="radio"
                                            value="basic"
                                            checked={toneType === 'basic'}
                                            onChange={() => {
                                                setToneType('basic');
                                                setTone('professional');
                                            }}
                                            className="w-4 h-4 mr-1.5"
                                        />
                                        <span className="text-xs text-zinc-600 dark:text-zinc-400">Basic</span>
                                    </label>
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="radio"
                                            value="mbti"
                                            checked={toneType === 'mbti'}
                                            onChange={() => {
                                                setToneType('mbti');
                                                setTone('INTJ');
                                            }}
                                            className="w-4 h-4 mr-1.5"
                                        />
                                        <span className="text-xs text-zinc-600 dark:text-zinc-400">MBTI</span>
                                    </label>
                                </div>
                            </div>

                            {toneType === 'basic' ? (
                                <select
                                    value={tone}
                                    onChange={(e) => setTone(e.target.value)}
                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
                                >
                                    <option value="professional">Professional</option>
                                    <option value="casual">Casual</option>
                                    <option value="technical">Technical</option>
                                </select>
                            ) : (
                                <select
                                    value={tone}
                                    onChange={(e) => setTone(e.target.value)}
                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
                                >
                                    <optgroup label="Analysts">
                                        <option value="INTJ">INTJ - Strategic</option>
                                        <option value="INTP">INTP - Innovative</option>
                                        <option value="ENTJ">ENTJ - Bold</option>
                                        <option value="ENTP">ENTP - Clever</option>
                                    </optgroup>
                                    <optgroup label="Diplomats">
                                        <option value="INFJ">INFJ - Insightful</option>
                                        <option value="INFP">INFP - Idealistic</option>
                                        <option value="ENFJ">ENFJ - Charismatic</option>
                                        <option value="ENFP">ENFP - Enthusiastic</option>
                                    </optgroup>
                                    <optgroup label="Sentinels">
                                        <option value="ISTJ">ISTJ - Practical</option>
                                        <option value="ISFJ">ISFJ - Dedicated</option>
                                        <option value="ESTJ">ESTJ - Organized</option>
                                        <option value="ESFJ">ESFJ - Caring</option>
                                    </optgroup>
                                    <optgroup label="Explorers">
                                        <option value="ISTP">ISTP - Bold</option>
                                        <option value="ISFP">ISFP - Flexible</option>
                                        <option value="ESTP">ESTP - Energetic</option>
                                        <option value="ESFP">ESFP - Spontaneous</option>
                                    </optgroup>
                                </select>
                            )}
                        </div>
                    </div>

                    {/* Advanced Options */}
                    <div>
                        <button
                            type="button"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-50 flex items-center gap-1.5 transition-colors"
                        >
                            {showAdvanced ? (
                                <HiChevronDown className="w-4 h-4" />
                            ) : (
                                <HiChevronRight className="w-4 h-4" />
                            )}
                            Advanced
                        </button>

                        {showAdvanced && (
                            <div className="mt-3 p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                                <label htmlFor="provider" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                    AI Provider
                                </label>
                                <select
                                    id="provider"
                                    value={provider}
                                    onChange={(e) => setProvider(e.target.value as any)}
                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-black border border-zinc-300 dark:border-zinc-700 rounded-lg text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
                                >
                                    <option value="default">Default (Gemini/OpenAI)</option>
                                    <option value="perplexity">Perplexity</option>
                                </select>
                                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                                    Perplexity requires PERPLEXITY_API_KEY in .env
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <HiSparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-blue-700 dark:text-blue-300">
                            <p className="font-medium mb-1">AI-Powered Generation</p>
                            <ul className="space-y-0.5 list-disc list-inside">
                                <li>Title will be automatically optimized for engagement</li>
                                <li>Tags will be generated based on content</li>
                            </ul>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <Link
                            href="/manage"
                            className="px-5 py-2.5 border border-zinc-300 dark:border-zinc-700 text-black dark:text-zinc-50 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-sm font-medium"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={isGenerating}
                            className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                        >
                            {isGenerating ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <HiSparkles className="w-4 h-4" />
                                    Generate
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
