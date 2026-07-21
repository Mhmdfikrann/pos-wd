import type { Metadata } from "next";
import { LandingPage } from "./landing/LandingPage";

export const metadata: Metadata = {
  title: "Wanna Dimsum — Dimsum Hangat, Rasa Juara",
  description:
    "Landing page publik Wanna Dimsum: menu unggulan, promo, outlet, dan Wanna Rewards untuk pelanggan.",
};

export default function Home() {
  return <LandingPage />;
}
