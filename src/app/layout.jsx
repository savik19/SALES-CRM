import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";

export const metadata = {
  title: "ScriptGuru CRM",
  description: "In-house sales CRM for the ScriptGuru team.",
};

// Root layout: persistent sidebar + the active screen.
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
