import "./globals.css";

export const metadata = {
  title: "InChat",
  description: "Connect privately. Anywhere. Even offline.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
