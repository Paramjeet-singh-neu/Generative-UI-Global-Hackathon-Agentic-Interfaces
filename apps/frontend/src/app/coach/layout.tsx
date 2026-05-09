import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CoachMe+ 🥊",
  description: "CoachMe+ — boxing clip analysis and drills",
};

export default function CoachLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
