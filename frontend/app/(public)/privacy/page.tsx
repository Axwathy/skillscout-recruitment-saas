import type { Metadata } from "next";
import Link from "next/link";

import { LegalSection, LegalShell } from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How SkillScout collects, uses, and protects personal data.",
};

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Privacy Policy"
      updated="June 2026"
      intro="This Privacy Policy explains how SkillScout collects, uses, shares, and protects personal information when you use our recruitment platform."
    >
      <LegalSection title="Information we collect">
        <p>
          We collect account details (name, email, organization), recruitment data you provide
          (job postings, applications, resumes, notes), and technical data (device, log, and usage
          information) needed to operate the service.
        </p>
      </LegalSection>
      <LegalSection title="How we use information">
        <p>
          We use data to provide and improve the platform — including parsing resumes, generating
          AI match scores and explanations, powering search and analytics, and securing your
          account. We do not sell personal data.
        </p>
      </LegalSection>
      <LegalSection title="AI processing">
        <p>
          Candidate scoring is produced by deterministic, auditable logic; AI is used only to
          explain scores in plain language. We do not use your private candidate data to train
          third-party foundation models.
        </p>
      </LegalSection>
      <LegalSection title="Sharing">
        <p>
          We share data only with service providers (e.g. hosting, storage) under contract, or when
          required by law. Recruiter and candidate data stays scoped to your organization.
        </p>
      </LegalSection>
      <LegalSection title="Data retention">
        <p>
          We keep personal data only as long as needed to provide the service or meet legal
          obligations. Recruiters and candidates can delete jobs, applications, and candidate
          records at any time from within the app.
        </p>
      </LegalSection>
      <LegalSection title="Your rights">
        <p>
          Subject to your jurisdiction (including GDPR), you may request access, correction,
          deletion, or export of your personal data, and may object to certain processing.
        </p>
      </LegalSection>
      <LegalSection title="Cookies">
        <p>
          We use cookies for sign-in, security, and (optionally) analytics. Manage your preferences
          via <span className="font-medium text-neutral-900">Cookie settings</span> in the footer.
        </p>
      </LegalSection>
      <LegalSection title="Contact">
        <p>
          Questions about privacy? Reach out via your account contact or{" "}
          <Link href="/" className="font-medium text-[#EB4425] hover:text-[#B51D00]">
            our home page
          </Link>
          .
        </p>
      </LegalSection>
    </LegalShell>
  );
}
