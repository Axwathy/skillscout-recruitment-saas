import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "SkillScout",
    template: "%s | SkillScout",
  },
  description:
    "AI-assisted recruitment platform — math ranks, AI explains, you decide.",
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
