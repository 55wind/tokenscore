import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 발표를 `npm run dev`로 해도 화면 구석의 개발 표시기가 하단 탭바를 가리지 않게 끕니다. 오류는 계속 표시됩니다.
  devIndicators: false,
};

export default nextConfig;
