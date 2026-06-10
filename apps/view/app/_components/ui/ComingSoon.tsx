import { Construction } from "lucide-react";
import PrimaryButton from "./PrimaryButton";

type ComingSoonProps = {
  title: string;
  description?: string;
};

export default function ComingSoon({
  title,
  description = "Estamos trabajando en esta seccion. Pronto estara disponible.",
}: ComingSoonProps) {
  return (
    <section className="flex flex-col items-center justify-center px-4 py-24 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-6">
        <Construction size={32} strokeWidth={1.5} aria-hidden />
      </div>
      <h1 className="text-2xl font-bold text-foreground">
        {title}
      </h1>
      <p className="text-muted mt-3 max-w-md">{description}</p>
      <div className="mt-8">
        <PrimaryButton href="/" variant="outline">
          Volver al inicio
        </PrimaryButton>
      </div>
    </section>
  );
}
