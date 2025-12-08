import "./globals.css";
import { UserProvider } from "./prodivers/UserProvider";
import { WebSocketProvider } from "./prodivers/WebsocketProvider";

export const metadata = {
  title: "Forum",
  description: "Modern forum app",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu">
      <body>
        <UserProvider>
          <WebSocketProvider>
            {children}
          </WebSocketProvider>
        </UserProvider>
      </body>
    </html>
  );
}
