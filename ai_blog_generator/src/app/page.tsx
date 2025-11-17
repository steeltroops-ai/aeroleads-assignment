import Link from "next/link";
import Navigation from "@/components/Navigation";
import { HiBookOpen, HiCog, HiLightningBolt, HiPencilAlt, HiSparkles, HiChartBar, HiCode, HiGlobe } from "react-icons/hi";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <Navigation hideUntilScroll={true} />
      {/* Hero Section */}
      <main className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="pt-16 pb-12 sm:pt-24 sm:pb-16">
            <div className="text-center">
              {/* Main Heading */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-black dark:text-zinc-50 mb-5">
                AI Blog Generator
              </h1>
              <p className="text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto mb-10">
                Create high-quality blog content powered by advanced AI. Support for OpenAI, Gemini, and Perplexity.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-16">
                <Link
                  href="/blog"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-medium text-white bg-black dark:bg-white dark:text-black rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-sm hover:shadow-md"
                >
                  <HiBookOpen className="w-5 h-5" />
                  View Blog
                </Link>
                <Link
                  href="/manage"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-medium text-black dark:text-zinc-50 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 transition-all shadow-sm hover:shadow-md"
                >
                  <HiCog className="w-5 h-5" />
                  Manage Posts
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-black dark:text-zinc-50 mb-3">
                Powerful Features
              </h2>
              <p className="text-base text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
                Everything you need to create and manage professional blog content
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {/* Feature 1 */}
              <div className="relative p-6 bg-zinc-50 dark:bg-black rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="w-10 h-10 bg-black dark:bg-white rounded-lg flex items-center justify-center mb-4">
                  <HiSparkles className="w-5 h-5 text-white dark:text-black" />
                </div>
                <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mb-2">
                  AI-Powered Generation
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Leverage multiple LLM providers including OpenAI, Google Gemini, and Perplexity for diverse, high-quality content generation.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="relative p-6 bg-zinc-50 dark:bg-black rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="w-10 h-10 bg-black dark:bg-white rounded-lg flex items-center justify-center mb-4">
                  <HiPencilAlt className="w-5 h-5 text-white dark:text-black" />
                </div>
                <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mb-2">
                  Easy Content Management
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Intuitive interface for creating, editing, and managing your blog posts. Full markdown support with live preview.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="relative p-6 bg-zinc-50 dark:bg-black rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="w-10 h-10 bg-black dark:bg-white rounded-lg flex items-center justify-center mb-4">
                  <HiLightningBolt className="w-5 h-5 text-white dark:text-black" />
                </div>
                <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mb-2">
                  Lightning Fast
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Built with Next.js 14 and optimized for performance. Static generation ensures blazing-fast page loads.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-zinc-50 dark:bg-black border-t border-zinc-200 dark:border-zinc-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="w-10 h-10 mx-auto mb-3 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                  <HiCode className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                </div>
                <div className="text-3xl font-bold text-black dark:text-zinc-50 mb-1">3+</div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">LLM Providers</div>
              </div>
              <div className="text-center p-6 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="w-10 h-10 mx-auto mb-3 bg-stone-100 dark:bg-stone-800 rounded-lg flex items-center justify-center">
                  <HiChartBar className="w-5 h-5 text-stone-700 dark:text-stone-300" />
                </div>
                <div className="text-3xl font-bold text-black dark:text-zinc-50 mb-1">100%</div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">Markdown Support</div>
              </div>
              <div className="text-center p-6 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="w-10 h-10 mx-auto mb-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center">
                  <HiGlobe className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
                </div>
                <div className="text-3xl font-bold text-black dark:text-zinc-50 mb-1">SEO</div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">Optimized</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
