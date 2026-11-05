import { Link } from "react-router";

export default function NotFound() {
  return (
    <section className="space-y-4">
      <p className="font-semibold text-primary">404</p>
      <h1 className="text-3xl font-bold">Page introuvable</h1>
      <p>Cette page n’existe pas.</p>
      <Link to="/" className="btn btn-primary">Retour à l’accueil</Link>
    </section>
  );
}
