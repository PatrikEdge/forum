import "./globals.css";
import { UserProvider } from "./prodivers/UserProvider";

export const metadata = {
  title: "Forum",
  description: "Modern forum app",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu">
      <body>
        <UserProvider>
          {children}
        </UserProvider>
      </body>
    </html>
  );
}
