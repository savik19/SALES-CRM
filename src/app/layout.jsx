import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import { ColumnConfigProvider } from "@/lib/columnConfig";
import { CompConfigProvider } from "@/lib/compConfig";
import { UsersProvider } from "@/lib/usersConfig";

export const metadata = {
  title: "ScriptGuru CRM",
  description: "In-house sales CRM for the ScriptGuru team.",
};

// Root layout: persistent sidebar + the active screen.
// ColumnConfigProvider makes the editable column config available app-wide.
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <UsersProvider>
          <ColumnConfigProvider>
            <CompConfigProvider>
              <div className="flex h-screen overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-y-auto">{children}</main>
              </div>
            </CompConfigProvider>
          </ColumnConfigProvider>
        </UsersProvider>
      </body>
    </html>
  );
}
