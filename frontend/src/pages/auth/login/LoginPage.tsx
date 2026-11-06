import { useForm, type SubmitHandler } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import FormInputText from '../../../components/form/FormInputText';
import FormTitle from '../../../components/form/FormTitle';
import FormButton from '../../../components/form/FormButton';
import { authClient } from '../../../lib/auth-client';
import { useState } from 'react';

type LoginForm = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);

  const loginSchema = z
    .object({
      email: z.email().min(2),
      password: z.string().trim().min(8),
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
    const { email, password } = values;

    try {
      await authClient.signIn.email(
        {
          email,
          password,
          callbackURL: '/',
          rememberMe: true,
        },
        {
          onRequest: (ctx) => {
            console.log('ctx on request: ', ctx);
          },
          onSuccess: (ctx) => {
            console.log('ctx onSucces: ', ctx);
          },
          onError: (error) => {
            setError('Serveur indisponible. Réessayer plus tard');
            console.error('onError: ', error);
          },
        },
      );
    } catch (err) {
      setError('Serveur indisponible. Réessayer plus tard');
      console.error('error try: ', err);
    }
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

      {error && <p>{error}</p>}

      <FormButton text="Inscription" />
    </form>
  );
}
