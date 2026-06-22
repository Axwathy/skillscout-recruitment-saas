/** @type {import('next').NextConfig} */
const backendOrigin = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1"],
  // Keep trailing slashes on proxied API calls — the Django backend requires
  // them (APPEND_SLASH). Without this, Next strips the slash and Django adds it
  // back, causing an infinite redirect loop through the rewrite below.
  skipTrailingSlashRedirect: true,
  // Proxy API calls through the frontend's own domain so auth cookies stay
  // first-party (frontend on Vercel, backend on Railway are different hosts).
  async rewrites() {
    // Always send a trailing slash to the backend. `:path*` does not capture
    // the incoming trailing slash, so we append one explicitly — otherwise
    // Django's APPEND_SLASH 301-redirects and we get an infinite proxy loop.
    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/api/:path*/`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
