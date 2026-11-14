import { useQuery } from '@tanstack/react-query';
import { getUserMedia } from '../media.service';
import { Link } from 'react-router';

export function MyMediaPage() {
  const mediaQuery = useQuery({
    queryKey: ['media', 'personnal'],
    queryFn: ({ signal }) => getUserMedia(signal),
  });

  if (mediaQuery.isPending) {
    return <p>Chargement des données</p>;
  }

  if (mediaQuery.isError) {
    return <p>Erreur :{mediaQuery.error.message}</p>;
  }

  if (mediaQuery.data.length === 0) {
    return <p>Aucun média ajouté</p>;
  }

  console.log(mediaQuery.data);

  return (
    <div className="bg-white p-10">
      <h1 className="text-3xl text-center font-bold">Ma liste de média</h1>
      <div className="overflow-x-auto rounded-box border border-base-content/5 bg-base-100">
        <table className="table">
          <thead className="">
            <tr className="text-bold">
              <th className="text-bold">Nom</th>
              <th className="text-bold">Type</th>
              <th className="text-bold">Status</th>
              <th className="text-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {mediaQuery.data.map((media) => (
              <tr
                className="hover:bg-base-300"
                key={media.id}
              >
                <td>
                  <Link to={`/media/${media.type}/${media.tmdbId}`}>{media.name}</Link>
                </td>
                <td>
                  <Link to={`/media/${media.type}/${media.tmdbId}`}>{media.type}</Link>
                </td>
                <td>
                  <Link to={`/media/${media.type}/${media.tmdbId}`}>{media.status}</Link>
                </td>
                <td>
                  <button className="btn btn-small btn-error">Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
