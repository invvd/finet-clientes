import type { Metadata } from "next";
import ComingSoon from "../_components/ui/ComingSoon";

export const metadata: Metadata = {
  title: "Test de velocidad",
};

export default function VelocidadPage() {
  return <ComingSoon title="Test de velocidad" />;
}
