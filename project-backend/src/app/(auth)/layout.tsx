// src/app/(auth)/layout.tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full min-h-screen lg:grid lg:grid-cols-2">
      
      {/* LEFT PANEL - Branding */}
      <div className="hidden bg-zinc-900 lg:flex flex-col justify-between p-10 text-white border-r border-zinc-800">
        <div className="flex items-center text-lg font-medium">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2 h-6 w-6"
          >
            <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
          </svg>
          CEiVoice
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">
              &ldquo;Streamlining support communication through intelligent voice integration.&rdquo;
            </p>
          </blockquote>
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
