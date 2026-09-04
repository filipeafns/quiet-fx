import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Quiet FX — Sound, with a lighter touch',
  description:
    'An open-source library of 72 gentle interface sounds. Explore, shape and export 432 variations, or bring the JavaScript sound engine into your app.',
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
