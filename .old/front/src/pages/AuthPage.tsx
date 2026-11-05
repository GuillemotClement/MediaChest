import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { authClient } from "../lib/auth-client";

type Props = { mode: "login" | "register" };

const messages: Record<string, string> = {
  INVALID_USERNAME_OR_PASSWORD: "Identifiant ou mot de passe incorrect.",
  USERNAME_IS_ALREADY_TAKEN: "Cet identifiant est déjà utilisé.",
  USER_ALREADY_EXISTS: "Cet identifiant est déjà utilisé.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Cet identifiant est déjà utilisé.",
  PASSWORD_TOO_SHORT: "Le mot de passe doit contenir au moins 8 caractères.",
  PASSWORD_TOO_LONG: "Le mot de passe ne doit pas dépasser 128 caractères.",
  INVALID_USERNAME: "L’identifiant doit contenir 3 à 30 lettres, chiffres, points ou underscores.",
};

export default function AuthPage({ mode }: Props) {
  const register = mode === "register";
  const { data: session, isPending, refetch } = authClient.useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const requestedPath: unknown = location.state?.from;
  const destination = typeof requestedPath === "string" && requestedPath.startsWith("/") && !requestedPath.startsWith("//")
    && !["/connexion", "/inscription"].includes(requestedPath.split("?")[0]) ? requestedPath : "/";
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (isPending) return <p role="status">Chargement de votre session…</p>;
  if (session) return <Navigate to={destination} replace />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (register && password !== confirmation) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setSubmitting(true);
    try {
      const result = register
        ? await fetch("/api/auth/sign-up/email", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: login.trim(), password }),
          }).then(async (response) => {
            if (response.ok) return { error: null };
            const body = await response.json().catch(() => ({}));
            return { error: { code: body.code, status: response.status } };
          })
        : await authClient.signIn.username({ username: login.trim(), password });
      if (result.error) {
        setError(result.error.status === 429
          ? "Trop de tentatives. Patientez un instant avant de réessayer."
          : messages[result.error.code || ""] || "Impossible de vous authentifier. Vérifiez vos informations et réessayez.");
        return;
      }
      // Registration uses a fetch because the API supplies Better Auth's internal email.
      await refetch();
      navigate(destination, { replace: true });
    } catch {
      setError("Le serveur est injoignable. Réessayez dans un instant.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="card mx-auto w-full max-w-md bg-base-100 shadow-sm" aria-labelledby="auth-title">
      <div className="card-body gap-5">
        <div>
          <h1 id="auth-title" className="card-title text-2xl">{register ? "Créer un compte" : "Connexion"}</h1>
          <p className="mt-2 text-base-content/70">{register ? "Rejoignez votre bibliothèque MediaChest." : "Connectez-vous pour accéder à votre bibliothèque."}</p>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2" htmlFor="login">
            Identifiant
            <input id="login" name="username" className="input w-full" autoComplete="username" autoCapitalize="none" spellCheck={false}
              required minLength={3} maxLength={30} pattern="[a-zA-Z0-9_.]{3,30}" value={login}
              onChange={(event) => setLogin(event.target.value)} aria-describedby={register ? "login-help" : undefined} />
          </label>
          {register && <p id="login-help" className="text-xs text-base-content/60">3 à 30 lettres, chiffres, points ou underscores. Sans distinction de majuscules.</p>}
          <label className="flex flex-col gap-2" htmlFor="password">
            Mot de passe
            <input id="password" name="password" type="password" className="input w-full" required minLength={register ? 8 : undefined} maxLength={128}
              autoComplete={register ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {register && <>
            <p className="text-xs text-base-content/60">Au moins 8 caractères.</p>
            <label className="flex flex-col gap-2" htmlFor="confirmation">
              Confirmer le mot de passe
              <input id="confirmation" name="confirmation" type="password" className="input w-full" required minLength={8} maxLength={128}
                autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
            </label>
          </>}
          {error && <p role="alert" className="text-sm text-error">{error}</p>}
          <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
            {submitting ? "Veuillez patienter…" : register ? "S’inscrire" : "Se connecter"}
          </button>
        </form>
        <p className="text-sm">
          {register ? "Déjà un compte ? " : "Pas encore de compte ? "}
          <Link className="link link-primary" to={register ? "/connexion" : "/inscription"} state={{ from: destination }}>
            {register ? "Se connecter" : "Créer un compte"}
          </Link>
        </p>
      </div>
    </section>
  );
}
