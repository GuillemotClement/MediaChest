type FormButton = {
  text: string;
};

export default function FormButton({ text }: FormButton) {
  return (
    <button className="w-full btn btn-primary mt-10" type="submit">
      {text}
    </button>
  );
}
