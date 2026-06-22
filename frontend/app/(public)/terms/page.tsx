import type { Metadata } from "next";

import { LegalSection, LegalShell } from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms governing your use of the SkillScout platform.",
};

export default function TermsPage() {
  return (
    <LegalShell
      title="Terms of Service"
      updated="June 2026"
      intro="These Terms of Service govern your access to and use of SkillScout. By using the platform, you agree to these terms."
    >
      <LegalSection title="Accounts">
        <p>
          You are responsible for the accuracy of your account information and for maintaining the
          confidentiality of your credentials. Recruiter accounts may require organization
          verification.
        </p>
      </LegalSection>
      <LegalSection title="Acceptable use">
        <p>
          You agree not to misuse the service — including attempting to disrupt it, access data you
          are not authorized to, or use it for unlawful discrimination. Candidate evaluations must
          comply with applicable employment law.
        </p>
      </LegalSection>
      <LegalSection title="Candidate data & AI scoring">
        <p>
          You are responsible for handling candidate data lawfully and for the hiring decisions you
          make. SkillScout provides transparent, auditable scoring as decision support — final
          decisions remain yours.
        </p>
      </LegalSection>
      <LegalSection title="Intellectual property">
        <p>
          SkillScout and its software are owned by us and our licensors. You retain ownership of the
          content and data you submit, and grant us the limited rights needed to operate the
          service.
        </p>
      </LegalSection>
      <LegalSection title="Disclaimers">
        <p>
          The service is provided &ldquo;as is.&rdquo; We do not warrant that AI explanations or
          match estimates are error-free, and they should not be the sole basis for any decision.
        </p>
      </LegalSection>
      <LegalSection title="Limitation of liability">
        <p>
          To the extent permitted by law, SkillScout is not liable for indirect or consequential
          damages arising from use of the service.
        </p>
      </LegalSection>
      <LegalSection title="Changes">
        <p>
          We may update these terms; material changes will be communicated. Continued use after
          changes constitutes acceptance.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
