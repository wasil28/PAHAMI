import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { NAMA_APLIKASI, TAGLINE } from "@/lib/config";
import { SnackbarProvider } from "@/components/ui/snackbar";
import "./globals.css";

// Plus Jakarta Sans (KEPUTUSAN §2, F2) — variable font, jadi tidak perlu daftar weight.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

// Material Symbols Rounded: hanya sumbu FILL yang variabel (0..1) agar file font kecil.
// display=block → ikon tidak sempat tampil sebagai teks ligatur ("upload") saat memuat.
const URL_IKON =
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0..1,0&display=block";

export const metadata: Metadata = {
  title: { template: `%s · ${NAMA_APLIKASI}`, default: NAMA_APLIKASI },
  description: `${TAGLINE} Unggah modul PDF, dapatkan topik, ringkasan, latihan, dan jawaban AI lengkap dengan rujukan halaman.`,
  applicationName: NAMA_APLIKASI,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5fbf6" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1512" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${jakarta.variable} h-full`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Font ikon dimuat lewat stylesheet karena next/font tidak mendukung Material Symbols. */}
        <link rel="stylesheet" href={URL_IKON} />
      </head>
      <body className="min-h-full bg-surface font-sans text-body-medium text-on-surface">
        <SnackbarProvider>{children}</SnackbarProvider>
      </body>
    </html>
  );
}
