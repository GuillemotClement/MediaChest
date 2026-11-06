type FormGlobalError = {
  error: string | null;
};

export default function FormGlobalError({ error }: FormGlobalError) {
  return <p className="text-error text-center font-bold">{error}</p>;
}
