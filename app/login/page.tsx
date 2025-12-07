"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) return setError(data.error || "Hiba történt.");
    router.push("/");
  };

  return (
    <div className="bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 min-h-screen flex items-center justify-center p-4 text-white">
      <div className="bg-black/50 backdrop-blur-xl p-8 rounded-3xl border border-white/20 shadow-xl max-w-sm w-full">
        <h1 className="text-2xl font-bold text-center mb-6">Bejelentkezés</h1>

        <div className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="E-mail cím"
            className="bg-white/20 border border-white/30 rounded-lg px-4 py-2 placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-lime-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Jelszó"
            className="bg-white/20 border border-white/30 rounded-lg px-4 py-2 placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-lime-400"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <p className="text-red-300 text-sm">{error}</p>}

          <button
            disabled={loading}
            onClick={handleLogin}
            className="bg-lime-500 hover:bg-lime-600 disabled:bg-white/30 disabled:text-white/40 text-black py-2 rounded-lg font-semibold transition"
          >
            {loading ? "Belépés..." : "Belépés"}
          </button>

          <p className="text-sm text-center text-white/70">
            Nincs fiókod?{" "}
            <button
              className="text-lime-300 hover:text-lime-200"
              onClick={() => router.push("/register")}
            >
              Regisztráció
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
