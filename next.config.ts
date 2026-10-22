import type { NextConfig } from "next";

const config: NextConfig = {
  logging: { incomingRequests: false },
  async headers() { return [{ source: "/f/:path*", headers: [{key:"Cache-Control",value:"private, no-store, max-age=0, must-revalidate"},{key:"Referrer-Policy",value:"no-referrer"},{key:"X-Robots-Tag",value:"noindex, nofollow"}] }, {source:"/my/:path*",headers:[{key:"Cache-Control",value:"private, no-store, max-age=0"},{key:"Referrer-Policy",value:"no-referrer"}]}]; },
  outputFileTracingIncludes: {
    "/api/dev/png": ["./public/fonts/NanumGothic-Regular.ttf"],
    "/api/share-image/*": ["./public/fonts/NanumGothic-Regular.ttf"],
  },
};

export default config;
