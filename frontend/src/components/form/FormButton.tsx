type FormButton = {
  text: string;
  disabled: boolean;
};

export default function FormButton({ text, disabled }: FormButton) {
  return (
    <button
      className={`w-full btn btn-primary mt-5 ${disabled ? 'disabled' : ''}`}
      type="submit"
    >
      {text}
    </button>
  );
}
