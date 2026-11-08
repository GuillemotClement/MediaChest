import { createBrowserRouter } from 'react-router';
import Homepage from '../pages/homepage/Homepage';
import App from '../App';
import LoginPage from '../pages/auth/login/LoginPage';
import requireAuth from '../middlewares/requireAuth';
import RegisterPage from '../pages/auth/register/RegisterPage';
import RouteErrorPage from '../pages/errors/RouteErrorPage';
import DetailMedia from '../pages/media/DetailMedia';
import DetailSerie from '../pages/media/DetailSerie';

export const router = createBrowserRouter([
  {
    Component: App,
    children: [
      {
        path: '/login',
        Component: LoginPage,
      },
      {
        path: '/register',
        Component: RegisterPage,
      },
      {
        // le middleware permet de vérifier qu'un user est bien authentifier pour accéder au pages
        middleware: [requireAuth],
        ErrorBoundary: RouteErrorPage,
        children: [
          {
            path: '/',
            Component: Homepage,
          },
          // TODO: change the path
          {
            path: '/media/:mediaId',
            Component: DetailMedia,
          },
          {
            path: '/serie/details/:serieId',
            Component: DetailSerie,
          },
        ],
      },
    ],
  },
]);
