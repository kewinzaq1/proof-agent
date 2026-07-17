import type { Metadata } from "next";
import { requireProofUser } from "../proof-auth";
import ExperimentClient from "./ExperimentClient";
import "./experiment.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Run an experiment — Proof",
  description: "Turn one behavior you want to change into a tiny, self-correcting experiment.",
};

export default async function ExperimentPage() {
  const user = await requireProofUser("/experiment");
  return <ExperimentClient user={{ displayName: user.displayName, email: user.email }} />;
}
