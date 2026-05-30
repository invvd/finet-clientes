type PrimaryButtonTypes = {
  text: string;
  link?: string;
};

export default function PrimaryButton({ text, link }: PrimaryButtonTypes) {
  return (
    <a href={link ? link : ""} className="bg-blue-400">
      {text}a
    </a>
  );
}
