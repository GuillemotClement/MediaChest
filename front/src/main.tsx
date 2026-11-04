import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import App from "./App";
import RequireAuth from "./components/RequireAuth";
import Search from "./pages/Search";
import MediaDetail from "./pages/MediaDetail";
import AdminMedia from "./pages/AdminMedia";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import "./index.css";

const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      { path: "/connexion", element: <AuthPage key="login" mode="login" /> },
      { path: "/inscription", element: <AuthPage key="register" mode="register" /> },
      {
        element: <RequireAuth />,
        children: [
          { path: "/", element: <Home /> },
          { path: "/recherche", element: <Search /> },
          { path: "/medias/:id", element: <MediaDetail /> },
          { path: "/administration/medias", element: <AdminMedia /> },
          { path: "*", element: <NotFound /> },
        ],
      },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode><RouterProvider router={router} /></StrictMode>,
);
