type ButtonDisplayChoice = {
  text: string;
  color: string;
  setChoice: () => void;
};

export default function ButtonDisplayChoice({ text, color, setChoice }: ButtonDisplayChoice) {
  return (
    <button
      type="button"
      className={`btn ${color}`}
      onClick={setChoice}
    >
      {text}
    </button>
  );
}
