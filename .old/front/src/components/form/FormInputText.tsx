import type { FieldError, UseFormRegisterReturn } from "react-hook-form";

type FormInputText = {
  register: UseFormRegisterReturn;
  type: "text" | "email" | "password";
  placeholder?: string;
  label: string;
  id: string;
  error?: FieldError;
  description?: string;
};

export default function FormInputText({
  register,
  type,
  placeholder,
  label,
  id,
  error,
  description,
}: FormInputText) {
  return (
    <fieldset className="fieldset">
      <label className="fieldset-legend" htmlFor={id}>
        {label}
      </label>
      <input
        type={type}
        id={id}
        className="input w-full"
        placeholder={placeholder}
        {...register}
      />
      {description && <p className="text-gray-400">{description}</p>}
      {error && (
        <p role="alert" className="text-error">
          {error.message}
        </p>
      )}
    </fieldset>
  );
}
