export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/records/:path*",
    "/statistics/:path*",
    "/appointments/:path*",
    "/admin/:path*",
  ],
};
