import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/hero.css";
import "./styles/player.css";

export const metadata = {
  title: "Mission PARAM",
  description: "A narrated, cinematic journey through PARAM — India's supercomputing story.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,300..700;1,300..700&family=DM+Sans:opsz,wght@9..40,300..700&family=IBM+Plex+Mono:wght@400;500&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
