// Global fallback for URLs outside any locale segment. Locale-aware 404 lives in [locale]/not-found.tsx.
export default function RootNotFound() {
  return (
    <html lang="vi">
      <body>
        <main id="main">
          <h1>404</h1>
        </main>
      </body>
    </html>
  );
}
