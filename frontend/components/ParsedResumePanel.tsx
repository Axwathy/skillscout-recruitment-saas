import type { ParsedResume } from "@/types/candidate";

const confidenceClasses: Record<ParsedResume["confidence"], string> = {
  high: "bg-success-600/10 text-success-600",
  medium: "bg-warning-600/10 text-warning-600",
  low: "bg-danger-600/10 text-danger-600",
};

const statusLabels: Record<ParsedResume["status"], string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
  error: "Failed",
};

interface ParsedResumePanelProps {
  parsedResume: ParsedResume | null;
}

export function ParsedResumePanel({ parsedResume }: ParsedResumePanelProps) {
  if (!parsedResume) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-3 text-sm text-neutral-500">
        Parsed profile is not available yet.
      </div>
    );
  }

  const data = parsedResume.data ?? {};
  const notes = data._metadata?.parsing_notes ?? [];
  const personalInfo = data.personal_info;
  const contactItems = [
    personalInfo?.email,
    personalInfo?.phone,
    personalInfo?.location,
  ].filter(Boolean);

  return (
    <div className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">Parsed profile</h3>
          <p className="text-xs text-neutral-500">
            {statusLabels[parsedResume.status]} via {parsedResume.parser_model || "parser"}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${confidenceClasses[parsedResume.confidence]}`}
        >
          {parsedResume.confidence} confidence
        </span>
      </div>

      {personalInfo && (
        <div>
          <h4 className="text-xs font-semibold uppercase text-neutral-500">Candidate</h4>
          <p className="mt-1 text-sm font-medium text-neutral-900">
            {personalInfo.full_name || "Name not found"}
          </p>
          {contactItems.length > 0 && (
            <p className="mt-1 text-xs text-neutral-500">{contactItems.join(" · ")}</p>
          )}
        </div>
      )}

      {data.summary && (
        <div>
          <h4 className="text-xs font-semibold uppercase text-neutral-500">Summary</h4>
          <p className="mt-1 text-sm text-neutral-700">{data.summary}</p>
        </div>
      )}

      {data.skills && data.skills.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase text-neutral-500">Skills</h4>
          <div className="mt-2 flex flex-wrap gap-2">
            {data.skills.slice(0, 32).map((skill) => (
              <span
                key={`${skill.name}-${skill.category ?? "skill"}`}
                className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700"
              >
                {skill.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.projects && data.projects.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase text-neutral-500">Projects</h4>
          <div className="mt-2 space-y-3">
            {data.projects.slice(0, 3).map((item, index) => (
              <div key={`${item.name}-${index}`} className="text-sm">
                <p className="font-medium text-neutral-900">{item.name || "Project"}</p>
                <p className="text-xs text-neutral-500">
                  {[item.start_date, item.end_date].filter(Boolean).join(" - ")}
                </p>
                {item.description && (
                  <p className="mt-1 text-neutral-600">{item.description}</p>
                )}
                {item.technologies && item.technologies.length > 0 && (
                  <p className="mt-1 text-xs text-neutral-500">
                    {item.technologies.slice(0, 10).join(" · ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.experience && data.experience.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase text-neutral-500">Experience</h4>
          <div className="mt-2 space-y-2">
            {data.experience.slice(0, 3).map((item, index) => (
              <div key={`${item.company}-${item.role}-${index}`} className="text-sm">
                <p className="font-medium text-neutral-900">
                  {item.role || "Role"} {item.company ? `at ${item.company}` : ""}
                </p>
                <p className="text-xs text-neutral-500">
                  {[item.start_date, item.end_date].filter(Boolean).join(" - ")}
                </p>
                {item.description && (
                  <p className="mt-1 text-neutral-600">{item.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.education && data.education.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase text-neutral-500">Education</h4>
          <div className="mt-2 space-y-1">
            {data.education.slice(0, 3).map((item, index) => (
              <p key={`${item.institution}-${index}`} className="text-sm text-neutral-700">
                {item.degree ? `${item.degree}, ` : ""}
                {item.institution}
                {item.graduation_year ? ` (${item.graduation_year})` : ""}
              </p>
            ))}
          </div>
        </div>
      )}

      {data.certifications && data.certifications.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase text-neutral-500">Certifications</h4>
          <div className="mt-2 space-y-1">
            {data.certifications.slice(0, 3).map((item, index) => (
              <p key={`${item.name}-${index}`} className="text-sm text-neutral-700">
                {item.name}
                {item.issuer ? `, ${item.issuer}` : ""}
                {item.year ? ` (${item.year})` : ""}
              </p>
            ))}
          </div>
        </div>
      )}

      {notes.length > 0 && (
        <div className="rounded-md bg-neutral-50 p-3">
          <h4 className="text-xs font-semibold uppercase text-neutral-500">Parsing notes</h4>
          <ul className="mt-1 space-y-1 text-xs text-neutral-600">
            {notes.slice(0, 4).map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
