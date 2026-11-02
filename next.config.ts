import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents는 끈다. 화면 대부분이 로그인 쿠키를 읽는 사용자별 화면이라
  // 정적 셸 이점이 작고, Supabase 쿠키 처리만 복잡해진다. (STACK.md 5절)
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
