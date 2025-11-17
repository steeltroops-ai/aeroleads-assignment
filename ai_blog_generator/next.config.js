/** @type {import('next').NextConfig} */
const nextConfig = {
    // Note: 'output: export' is disabled to support API routes for blog management
    // For static-only deployment, comment out API routes and re-enable 'output: export'
    images: {
        unoptimized: true,
    },
    trailingSlash: true,
};

module.exports = nextConfig;
