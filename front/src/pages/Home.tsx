import { Link } from "react-router";
export default function Home() {
  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold">Bienvenue sur MediaChest</h1>
      <p className="text-base-content/70">Trouvez votre prochain film ou votre prochaine série et ajoutez-les à votre liste à voir.</p>
      <Link to="/recherche" className="btn btn-primary">Rechercher un média</Link>
    </section>
  );
}
