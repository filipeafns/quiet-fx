import { pageMetadata } from '@/lib/site';
export const metadata = pageMetadata(
  'UI Sound Effects Studio | WAV & MP3 Export | Quiet FX',
  'Preview 72 UI sounds and 432 variations. Tune keys, scales and textures, test card flips and motion sequences, then export WAV or MP3 for your app.',
  '/studio',
);
export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
