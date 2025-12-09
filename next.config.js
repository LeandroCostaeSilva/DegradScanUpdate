const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ""
const isStaticExport = process.env.STATIC_EXPORT === "true"

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: isStaticExport ? "export" : undefined,
  images: isStaticExport ? { unoptimized: true } : undefined,
  basePath,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  trailingSlash: isStaticExport ? true : undefined,
}

module.exports = nextConfig
