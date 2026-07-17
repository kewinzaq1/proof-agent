import type { Metadata } from "next";
import { getProofUser } from "../proof-auth";
import { redirect } from "next/navigation";
import LoginClient from "./LoginClient";
import "../experiment/experiment.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in — Proof",
  description: "Your private place to notice patterns and learn from real life.",
};

export default async function LoginPage() {
  if (await getProofUser()) redirect("/experiment");
  return <LoginClient />;
}
