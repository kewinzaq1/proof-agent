import type { Metadata } from "next";
import ExperimentClient from "./ExperimentClient";
import "./experiment.css";

export const metadata: Metadata = {
  title: "Run an experiment — Proof",
  description: "Turn one behavior you want to change into a tiny, self-correcting experiment.",
};

export default function ExperimentPage() {
  return <ExperimentClient />;
}
