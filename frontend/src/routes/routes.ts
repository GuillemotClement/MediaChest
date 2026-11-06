import { createBrowserRouter } from 'react-router';
import Homepage from '../pages/homepage/Homepage';
import App from '../App';
import LoginPage from '../pages/auth/login/LoginPage';
import requireAuth from '../middlewares/requireAuth';
import RegisterPage from '../pages/auth/register/RegisterPage';

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
        children: [
          {
            path: '/',
            Component: Homepage,
          },
        ],
      },
    ],
  },
]);
