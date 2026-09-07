import {
  pageMetadata,
  SITE_TITLE,
  SITE_DESCRIPTION,
  structuredData,
} from '@/lib/site';
import './globals.css';
export const metadata = pageMetadata(SITE_TITLE, SITE_DESCRIPTION);
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="describedby"
          href="/llms.txt"
          type="text/plain"
          title="Quiet FX documentation index"
        />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
          }}
        />
        {children}
      </body>
    </html>
  );
}
