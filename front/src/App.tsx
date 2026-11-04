import { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router";
import { authClient } from "./lib/auth-client";

export default function App() {
  const { data: session, refetch } = authClient.useSession();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function logout() {
    setSigningOut(true);
    setError("");
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("Logout failed");
      await refetch();
      navigate("/connexion", { replace: true });
    } catch {
      setError("La déconnexion a échoué. Réessayez.");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-base-200">
      <header className="border-b border-base-300 bg-base-100">
        <nav aria-label="Navigation principale" className="navbar mx-auto max-w-6xl flex-wrap gap-3 px-4">
          <Link to="/" className="mr-auto text-xl font-bold">MediaChest</Link>
          {session && <>
            <Link to="/" className="btn btn-ghost btn-sm">Accueil</Link>
            <Link to="/recherche" className="btn btn-ghost btn-sm">Rechercher</Link>
            {"role" in session.user && session.user.role === "admin" && <Link to="/administration/medias" className="btn btn-ghost btn-sm">Administration</Link>}
            <span className="max-w-40 truncate text-sm">{session.user.displayUsername || session.user.username}</span>
            <button className="btn btn-outline btn-sm" onClick={logout} disabled={signingOut}>
              {signingOut ? "Déconnexion…" : "Se déconnecter"}
            </button>
          </>}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        {error && <p role="alert" className="mb-4 text-error">{error}</p>}
        <Outlet />
      </main>
      <footer className="border-t border-base-300 bg-base-100 px-4 py-5 text-center text-sm text-base-content/60">
        MediaChest — Votre bibliothèque multimédia
      </footer>
    </div>
  );
}
