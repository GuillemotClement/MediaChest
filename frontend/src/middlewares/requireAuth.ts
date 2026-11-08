import { redirect } from 'react-router';
import { authClient } from '../lib/auth-client';

/**
 * Middleware qui permet de vérifier sur un user est connecter pour accèder a l'app
 * On utilise l'instance de better auth pour acceder aux info de session
 */
export default async function requireAuth() {
  const { data: session, error } = await authClient.getSession();

  if (error) {
    throw new Error('Impossible de vérifier la session');
  }

  if (!session) {
    throw redirect('/login');
  }
}
