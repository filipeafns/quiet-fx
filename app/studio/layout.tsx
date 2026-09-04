import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Quiet FX — Sound studio',
  description:
    'Explore 72 gentle interface sounds, shape their variations, and pair them with motion.',
};
export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
