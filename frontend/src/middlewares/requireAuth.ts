import { redirect } from 'react-router';
import { authClient } from '../lib/auth-client';

/**
 * Middleware qui permet de vérifier sur un user est connecter pour accèder a l'app
 * On utilise l'instance de better auth pour acceder aux info de session
 */
export default async function requireAuth() {
  const { data: session, error } = await authClient.getSession();

  if (error) {
    console.error(error.message);
    throw redirect('/login');
  }

  if (!session) {
    console.error('Pas de session');
    throw redirect('/login');
  }
}
