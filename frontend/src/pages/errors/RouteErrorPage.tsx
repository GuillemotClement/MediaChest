import { useRouteError } from 'react-router';

export default function RouteErrorPage() {
  const error = useRouteError();

  return (
    <div className="">
      <h1>Une erreur est survenue</h1>
      <p>{error instanceof Error ? error.message : 'Impossible de charger la page'}</p>

      <button
        type="button"
        onClick={() => window.location.reload()}
      >
        Réeassayer
      </button>
    </div>
  );
}
