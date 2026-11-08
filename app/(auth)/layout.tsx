import { Logo } from "@/components/shell/logo";
import { PanelMerek } from "@/components/auth/panel-merek";

/**
 * "Layout Auth" S-02..S-05 (FT-01 ui-ux §1 & §4):
 * - Compact  : satu kolom, margin 16dp, logo di atas, form langsung di surface (tanpa kartu).
 * - Medium   : latar surface-container, kartu form 480dp di tengah, logo di atas kartu.
 * - Expanded : dua panel 50:50 — panel merek kiri, kartu form maks. 400dp di kanan.
 */
export default function LayoutAuth({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh expanded:grid expanded:grid-cols-2">
      <PanelMerek className="hidden expanded:sticky expanded:top-0 expanded:flex expanded:h-dvh" />
      <main className="flex min-h-dvh flex-col items-center bg-surface px-4 py-6 medium:justify-center medium:bg-surface-container medium:py-12 expanded:bg-surface expanded:px-6">
        <div className="w-full max-w-[568px] medium:max-w-[480px] expanded:max-w-[400px]">
          <Logo className="mb-8 expanded:hidden" />
          <div className="animate-masuk medium:rounded-lg medium:bg-surface-container-low medium:p-6 expanded:p-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
