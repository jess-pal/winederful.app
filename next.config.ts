import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG_SLUG,
  project: process.env.SENTRY_PROJECT_SLUG,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  disableLogger: true
});
