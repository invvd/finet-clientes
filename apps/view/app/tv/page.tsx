import type { Metadata } from "next";
import ComingSoon from "../_components/ui/ComingSoon";

export const metadata: Metadata = {
  title: "TV Digital",
};

export default function TvPage() {
  return <ComingSoon title="TV Digital" />;
}
