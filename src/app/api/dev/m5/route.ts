import {createPreviewProbe} from '@/lib/m5-preview';
export const runtime='nodejs';
export const dynamic='force-dynamic';
// NEXT_PUBLIC is inlined at build time, matching the product widget's Sitekey.
export const GET=createPreviewProbe(process.env,process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY);
