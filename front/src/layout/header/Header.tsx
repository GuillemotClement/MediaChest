import type { Session } from "better-auth";
import { Link } from "react-router";

// type Header = {
//   session: Session
// }

export default function Header({ session, signOut, logout } ){
  return (
    <header className="border-b border-base-300 bg-base-100">
        <nav aria-label="Navigation principale" className="navbar mx-auto max-w-6xl flex-wrap gap-3 px-4">
          <Link to="/" className="mr-auto text-xl font-bold">MediaChest</Link>
          {session && <>
            <Link to="/" className="btn btn-ghost btn-sm">Accueil</Link>
            <Link to="/recherche" className="btn btn-ghost btn-sm">Rechercher</Link>
            {"role" in session.user && session.user.role === "admin" && <Link to="/administration/medias" className="btn btn-ghost btn-sm">Administration</Link>}
            <span className="max-w-40 truncate text-sm">{session.user.displayUsername || session.user.username}</span>
            <button className="btn btn-outline btn-sm" onClick={logout} disabled={signOut}>
              {signOut ? "Déconnexion…" : "Se déconnecter"}
            </button>
          </>}
        </nav>
      </header>
  )
}