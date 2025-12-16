export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md w-full rounded-2xl border p-6">
        <h1 className="text-xl font-bold">403 – Nincs jogosultság</h1>
        <p className="mt-2 opacity-80">
          Ehhez az oldalhoz nincs hozzáférésed.
        </p>
        <a className="inline-block mt-4 underline" href="/">
          Vissza a főoldalra
        </a>
      </div>
    </div>
  );
}
