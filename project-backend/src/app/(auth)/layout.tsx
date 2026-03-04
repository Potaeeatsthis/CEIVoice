// src/app/(auth)/layout.tsx
import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full min-h-screen lg:grid lg:grid-cols-2">

      {/* LEFT PANEL - Branding */}
      <div
        className="hidden lg:flex flex-col justify-between p-10 text-white border-r border-zinc-800 bg-cover bg-center"
        style={{ backgroundImage: "url('/login-bg.png')" }}
      >
        <div className="flex items-center text-lg font-medium">
          <Image
            src="/logo_cei.png"
            alt="CEiVoice Logo"
            width={32}
            height={32}
            className="mr-2"
          />
          CEiVoice
        </div>

      </div>

      {/* RIGHT PANEL - Content Container */}
      <div className="flex items-center justify-center py-12 bg-zinc-950 text-zinc-50">
        <div className="mx-auto grid w-[350px] gap-6">
          {children}
        </div>
      </div>

    </div>
  );
}
