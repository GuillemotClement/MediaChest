import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import * as z from 'zod';
import { authClient } from '../../../lib/auth-client';
import FormTitle from '../../../components/form/FormTitle';
import FormInputText from '../../../components/form/FormInputText';
import FormGlobalError from '../../../components/form/FormGlobalError';
import FormButton from '../../../components/form/FormButton';

type RegisterForm = {
  email: string;
  name: string;
  password: string;
};

export default function RegisterPage() {
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [disabled, setDisabled] = useState(false);

  const navigate = useNavigate();

  const registerSchema = z.object({
    email: z.email('Email invalide'),
    name: z
      .string()
      .min(3, { error: 'Au moins 3 caractères attendus' })
      .max(30, { error: '30 caractères maximals' }),
    password: z.string().min(8, { error: 'Au moins 8 caractères attendus' }),
  });

  const defaultValues = {
    email: '',
    name: '',
    password: '',
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    defaultValues,
    resolver: zodResolver(registerSchema),
  });

  const onSubmit: SubmitHandler<RegisterForm> = async (values: RegisterForm) => {
    setDisabled(true);
    setGlobalError(null);

    const { error } = await authClient.signUp.email({
      email: values.email,
      name: values.name,
      password: values.password,
      callbackURL: '/',
    });

    if (error) {
      setGlobalError(
        error.status === 401
          ? "Echec de l'inscription"
          : 'Inscription impossible. Réessayer plus tard',
      );
      setDisabled(false);
      return;
    }

    navigate('/', { replace: true });
  };

  return (
    <form
      className="border bg-white rounded-2xl p-10"
      onSubmit={handleSubmit(onSubmit)}
    >
      <FormTitle title="Inscription" />

      <FormInputText
        register={register('email')}
        type="email"
        placeholder="example@mail.com"
        label="Email"
        id="email"
        error={errors.email}
      />

      <FormInputText
        register={register('name')}
        type="text"
        placeholder="gizmo"
        label="Nom d'utilisateur"
        id="name"
        error={errors.name}
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
        text="Inscription"
        disabled={disabled}
      />

      <div className="text-center mt-5">
        <Link
          to="/login"
          className="mt-5 text-gray-400 text-center link"
        >
          J'ai déjà un compte
        </Link>
      </div>
    </form>
  );
}
