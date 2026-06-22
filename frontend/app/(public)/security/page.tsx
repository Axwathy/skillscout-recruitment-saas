import type { Metadata } from "next";

import { LegalSection, LegalShell } from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Security",
  description: "How SkillScout protects your data and candidates.",
};

export default function SecurityPage() {
  return (
    <LegalShell
      title="Security"
      updated="June 2026"
      intro="Security is foundational to SkillScout. This page outlines the practices we use to protect your data and your candidates."
    >
      <LegalSection title="Data protection">
        <p>
          Data is encrypted in transit (TLS) and at rest. Sensitive credentials are hashed, and
          uploaded resumes are stored in access-controlled object storage.
        </p>
      </LegalSection>
      <LegalSection title="Access control">
        <p>
          Authentication uses JWT with secure, HTTP-only cookies. Recruiter data is strictly scoped
          to the user&rsquo;s organization, and API access is permission-checked on every request.
        </p>
      </LegalSection>
      <LegalSection title="Rate limiting & abuse prevention">
        <p>
          Authentication, upload, and search endpoints are rate-limited to protect against abuse and
          automated attacks. Sensitive actions are recorded in an audit log.
        </p>
      </LegalSection>
      <LegalSection title="Fair & transparent AI">
        <p>
          Candidate rankings are produced by deterministic, auditable scoring — not opaque models —
          so decisions can be reviewed and explained. AI is used only to articulate the reasoning.
        </p>
      </LegalSection>
      <LegalSection title="Data lifecycle">
        <p>
          You control your data: jobs, applications, and candidate records can be deleted at any
          time, and hired candidates are flagged for data-retention review.
        </p>
      </LegalSection>
      <LegalSection title="Responsible disclosure">
        <p>
          If you believe you have found a security vulnerability, please report it through your
          account contact so we can investigate and remediate promptly.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
