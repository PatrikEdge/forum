// 🔄 Broadcast helper (server-only)
export function wssBroadcast(data: any) {
  // @ts-ignore
  const globalWSS = globalThis.__WSS__ as any;
  if (!globalWSS) return;

  const message = JSON.stringify(data);
  for (const client of globalWSS.clients) {
    if (client.readyState === 1) client.send(message);
  }
}
