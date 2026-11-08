import { Link, useNavigate } from 'react-router';
import { authClient } from '../../lib/auth-client';

export default function Header() {
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();

  const username = session?.user.name ?? '';
  const initial = username.charAt(1).toUpperCase();

  const logout = async () => {
    try {
      await authClient.signOut();
      navigate('/login', { replace: true });
    } catch {
      navigate('/');
    }
  };

  return (
    <header className="navbar bg-base-100 shadow-sm items-center">
      <div className="flex-1">
        <Link
          to="/"
          className="btn btn-ghost text-xl"
        >
          MediaChest
        </Link>
      </div>

      {session && (
        <div className="flex-none ">
          <ul className="menu menu-horizontal px-1">
            <li>
              <Link to="/">Accueil</Link>
            </li>

            {/* {session.user.role === 'admin' && (
              <li>
                <Link to="/administration/medias">Administration</Link>
              </li>
            )} */}

            <div className="dropdown dropdown-end">
              <div
                tabIndex={0}
                role="button"
                className="btn btn-ghost btn-circle avatar"
              >
                <div className="w-10 rounded-full bg-primary flex justify-center items-center text-white">
                  {initial}
                </div>
              </div>
              <ul
                tabIndex={-1}
                className="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow"
              >
                <li>
                  <a
                    className="btn btn-error"
                    onClick={logout}
                  >
                    Logout
                  </a>
                </li>
              </ul>
            </div>
          </ul>
        </div>
      )}
    </header>
  );
}
