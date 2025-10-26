import './globals.css';

export const metadata = {
  title: 'Sora 2 Free',
  description: 'Text-to-video UI with mock generation, no watermark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
      </body>
    </html>
  );
}
