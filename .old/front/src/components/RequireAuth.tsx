import { Navigate, Outlet, useLocation } from "react-router";
import { authClient } from "../lib/auth-client";

export default function RequireAuth() {
  const { data: session, isPending, error, refetch } = authClient.useSession();
  const location = useLocation();
  if (isPending) return <p role="status">Chargement de votre session…</p>;
  if (error)
    return (
      <div role="alert" className="space-y-4">
        <p>
          Impossible de vérifier votre session. Vérifiez que le serveur est
          démarré.
        </p>
        <button className="btn" onClick={() => void refetch()}>
          Réessayer
        </button>
      </div>
    );
  if (!session)
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  return <Outlet />;
}
