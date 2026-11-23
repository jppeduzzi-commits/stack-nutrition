/** @type {import('next').NextConfig} */
const nextConfig = {
  // The food-search route reads data/foods.sqlite at runtime via a dynamic
  // file path (node:sqlite), which Next's static tracing can't discover on
  // its own -- without this, the file gets built locally but never bundled
  // into the deployed Function.
  outputFileTracingIncludes: {
    "/api/food-search": ["./data/foods.sqlite"],
  },
};

export default nextConfig;
