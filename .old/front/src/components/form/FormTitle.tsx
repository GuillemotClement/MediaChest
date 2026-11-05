type FormTitle = {
  title: string;
};

export default function FormTitle({ title }: FormTitle) {
  return <h2 className="text-2xl font-bold">{title}</h2>;
}
