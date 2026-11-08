import { useForm, type SubmitHandler } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import FormInputText from '../../../components/form/FormInputText';
import FormTitle from '../../../components/form/FormTitle';
import FormButton from '../../../components/form/FormButton';
import { authClient } from '../../../lib/auth-client';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import FormGlobalError from '../../../components/form/FormGlobalError';

type LoginForm = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [disabled, setDisabled] = useState(false);

  const navigate = useNavigate();

  const loginSchema = z
    .object({
      email: z.email('Email invalide').min(2),
      password: z.string().min(8, { error: 'Le mot de passe doit contenir au moins 8 caractères' }),
    })
    .required();

  const defaultValues = {
    email: '',
    password: '',
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    defaultValues,
    resolver: zodResolver(loginSchema),
  });

  const onSubmit: SubmitHandler<LoginForm> = async (values: LoginForm) => {
    setDisabled(true);
    setGlobalError(null);

    const { error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
      rememberMe: true,
    });

    if (error) {
      setGlobalError(
        error.status === 401
          ? 'Email ou mot de passe incorrect'
          : 'Connexion impossible. Réeassyer plus tard',
      );
      setDisabled(false);
      return;
    }

    // replace: true -> permet de remplace la page dans l'historique. Un retourn en arriere ne ramene par sur login
    navigate('/', { replace: true });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="border bg-white rounded-2xl p-10"
    >
      <FormTitle title="Connexion" />

      <FormInputText
        register={register('email')}
        type="email"
        placeholder="example@mail.com"
        label="Email"
        id="email"
        error={errors.email}
      />

      <FormInputText
        register={register('password')}
        type="password"
        placeholder="*********"
        label="Mot de passe"
        id="password"
        error={errors.password}
        description="8 caractères attendus"
      />

      {globalError && <FormGlobalError error={globalError} />}

      <FormButton
        text="Connexion"
        disabled={disabled}
      />

      <div className="text-center mt-5">
        <Link
          to="/register"
          className="mt-5 text-gray-400 text-center link"
        >
          Je n'ai pas de compte
        </Link>
      </div>
    </form>
  );
}
