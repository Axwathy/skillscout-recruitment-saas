import json
import re
from dataclasses import dataclass, field
from typing import Any, Literal

import httpx
from django.conf import settings
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    ValidationError,
    field_validator,
    model_validator,
)

PROMPT_TEMPLATE = """You are an expert resume parser for a recruitment platform.
Extract structured data from the raw resume text and return ONLY valid JSON with no
markdown fences, no commentary, and no fields outside the requested structure.
Do not fabricate details that are not explicitly stated or clearly implied.
Every skill, employer, school, certification, URL, email, and phone value MUST be
present in the raw resume text. If a value is uncertain or not visible, use null or [].
Prefer exact wording from the resume over normalized wording.
For student or early-career resumes, put portfolio work under "projects"; do NOT invent
professional employers when the resume only lists projects.

Raw resume text:
```
{raw_text}
```

Return JSON with EXACTLY this shape. Follow the enum rules strictly:
{{
  "personal_info": {{
    "full_name": string|null,
    "email": string|null,
    "phone": string|null,
    "location": string|null,
    "linkedin_url": string|null,
    "github_url": string|null,
    "portfolio_url": string|null
  }},
  "summary": string|null,
  "skills": [
    {{
      "name": string,
      "proficiency": "expert"|"advanced"|"intermediate"|"beginner",
      "category": "programming_language"|"framework"|"database"|"cloud"|
        "devops"|"tool"|"soft_skill"|"domain"|"other",
      "years_used": number|null
    }}
  ],
  "experience": [
    {{
      "company": string,
      "role": string,
      "start_date": "YYYY-MM"|null,
      "end_date": "YYYY-MM"|"present"|null,
      "location": string|null,
      "description": string|null,
      "achievements": [string]
    }}
  ],
  "projects": [
    {{
      "name": string,
      "start_date": "YYYY-MM"|null,
      "end_date": "YYYY-MM"|"present"|null,
      "description": string|null,
      "technologies": [string],
      "achievements": [string],
      "url": string|null
    }}
  ],
  "education": [
    {{
      "institution": string,
      "degree": string|null,
      "field_of_study": string|null,
      "graduation_year": integer|null,
      "gpa": string|null
    }}
  ],
  "certifications": [
    {{
      "name": string,
      "issuer": string|null,
      "year": integer|null,
      "credential_id": string|null
    }}
  ],
  "languages": [
    {{
      "language": string,
      "proficiency": string
    }}
  ],
  "_metadata": {{
    "parsing_confidence": "high"|"medium"|"low",
    "parsing_notes": [string],
    "total_years_experience": number|null
  }}
}}

Enum usage rules (MUST follow):
- skills[].proficiency: use "intermediate" when the level is not stated; only use
  "expert" or "advanced" when the resume explicitly claims it.
- skills[].category rules:
    programming_language = Python, JavaScript, TypeScript, Java, Go, C++,
      HTML5, CSS3, SQL, Solidity, etc.
    framework = React, Next.js, Django, Flask, FastAPI, Express, Vue, Angular, Tailwind CSS, etc.
    database = PostgreSQL, MySQL, MongoDB, Redis, SQLite, Supabase, pgvector, etc.
    cloud = AWS, Azure, GCP, Vercel, Railway, Netlify, etc.
    devops = Docker, Kubernetes, GitHub Actions, CI/CD, Terraform, etc.
    tool = Git, GitHub, Postman, Figma, Jira, VS Code, Ollama, Celery, etc.
    soft_skill = Leadership, Communication, Problem Solving, etc.
    domain = Machine Learning, NLP, REST APIs, Blockchain, Data Analysis, etc.
    other = only when none of the above fit.
"""


SkillCategory = Literal[
    "programming_language",
    "framework",
    "database",
    "cloud",
    "devops",
    "tool",
    "soft_skill",
    "domain",
    "other",
]
Proficiency = Literal["expert", "advanced", "intermediate", "beginner"]
Confidence = Literal["high", "medium", "low"]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    @model_validator(mode="before")
    @classmethod
    def _coerce_null_required_strings(cls, data: Any) -> Any:
        """Accept ``null`` for non-optional ``str`` fields and fall back to their
        default. LLMs routinely emit ``null`` for sub-fields a resume omits (e.g.
        a language with no stated proficiency). Without this, a single ``null``
        anywhere raises ValidationError and discards the whole parse, forcing the
        fallback model / heuristic — which is exactly what we want to avoid.
        """
        if not isinstance(data, dict):
            return data
        for name, fld in cls.model_fields.items():
            if fld.annotation is not str:
                continue
            key = name if name in data else fld.alias
            if key in data and data[key] is None:
                data[key] = fld.default if isinstance(fld.default, str) else ""
        return data


class PersonalInfo(StrictModel):
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    location: str | None = None
    linkedin_url: str | None = None
    github_url: str | None = None
    portfolio_url: str | None = None


class Skill(StrictModel):
    name: str
    proficiency: Proficiency = "intermediate"
    category: SkillCategory = "other"
    years_used: float | None = None

    @field_validator("proficiency", mode="before")
    @classmethod
    def normalize_proficiency(cls, value: str | None) -> Proficiency:
        allowed = {"expert", "advanced", "intermediate", "beginner"}
        normalized = str(value or "").strip().lower()
        # Default to "intermediate" (not "beginner") when the level is unspecified;
        # most listed skills are at working proficiency, not entry-level.
        return normalized if normalized in allowed else "intermediate"

    @field_validator("category", mode="before")
    @classmethod
    def normalize_category(cls, value: str | None) -> SkillCategory:
        allowed = {
            "programming_language",
            "framework",
            "database",
            "cloud",
            "devops",
            "tool",
            "soft_skill",
            "domain",
            "other",
        }
        normalized = str(value or "").strip().lower().replace(" ", "_")
        return normalized if normalized in allowed else "other"


class Experience(StrictModel):
    company: str = ""
    role: str = ""
    start_date: str | None = None
    end_date: str | None = None
    location: str | None = None
    description: str | None = None
    achievements: list[str] = Field(default_factory=list)

    @field_validator("start_date", mode="before")
    @classmethod
    def validate_start_date(cls, value: str | None) -> str | None:
        return normalize_resume_date(value)

    @field_validator("end_date", mode="before")
    @classmethod
    def validate_end_date(cls, value: str | None) -> str | None:
        return normalize_resume_date(value, allow_present=True)


class Project(StrictModel):
    name: str = ""
    start_date: str | None = None
    end_date: str | None = None
    description: str | None = None
    technologies: list[str] = Field(default_factory=list)
    achievements: list[str] = Field(default_factory=list)
    url: str | None = None

    @field_validator("start_date", mode="before")
    @classmethod
    def validate_start_date(cls, value: str | None) -> str | None:
        return normalize_resume_date(value)

    @field_validator("end_date", mode="before")
    @classmethod
    def validate_end_date(cls, value: str | None) -> str | None:
        return normalize_resume_date(value, allow_present=True)


class Education(StrictModel):
    institution: str = ""
    degree: str | None = None
    field_of_study: str | None = None
    graduation_year: int | None = None
    gpa: str | None = None


class Certification(StrictModel):
    name: str = ""
    issuer: str | None = None
    year: int | None = None
    credential_id: str | None = None


class Language(StrictModel):
    language: str = ""
    proficiency: str = ""


class ParseMetadata(StrictModel):
    parsing_confidence: Confidence = "low"
    parsing_notes: list[str] = Field(default_factory=list)
    total_years_experience: float | None = None


class ParsedResumeSchema(StrictModel):
    personal_info: PersonalInfo = Field(default_factory=PersonalInfo)
    summary: str | None = None
    skills: list[Skill] = Field(default_factory=list)
    experience: list[Experience] = Field(default_factory=list)
    projects: list[Project] = Field(default_factory=list)
    education: list[Education] = Field(default_factory=list)
    certifications: list[Certification] = Field(default_factory=list)
    languages: list[Language] = Field(default_factory=list)
    metadata: ParseMetadata = Field(default_factory=ParseMetadata, alias="_metadata")


@dataclass
class ParseResult:
    data: dict[str, Any]
    confidence: str
    model: str
    validation_errors: list[str] = field(default_factory=list)
    token_usage: dict[str, Any] = field(default_factory=dict)
    estimated_cost: float = 0


EMAIL_RE = r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+"
PHONE_RE = r"(?:\+?\d[\d\s().-]{7,}\d)"
URL_RE = r"(?<!@)(?:https?://|www\.|[a-z0-9][a-z0-9.-]+\.[a-z]{2,}/)[^\s),;]*"
SECTION_HEADINGS = {
    "summary",
    "profile",
    "objective",
    "skills",
    "technical skills",
    "experience",
    "work experience",
    "professional experience",
    "education",
    "certifications",
    "projects",
    "project",
    "languages",
    "leadership",
    "leadership & activities",
    "resume",
    "curriculum vitae",
}

KNOWN_SKILLS: list[tuple[str, SkillCategory, tuple[str, ...]]] = [
    ("Python", "programming_language", ("python", "py")),
    ("JavaScript", "programming_language", ("javascript", "js", "ecmascript", "es6")),
    ("TypeScript", "programming_language", ("typescript", "ts")),
    ("Java", "programming_language", ("java",)),
    ("C++", "programming_language", ("c++", "cpp")),
    ("C#", "programming_language", ("c#", "c sharp", "csharp")),
    ("Go", "programming_language", ("golang", "go")),
    ("Ruby", "programming_language", ("ruby", "rb")),
    ("PHP", "programming_language", ("php",)),
    ("Rust", "programming_language", ("rust",)),
    ("Kotlin", "programming_language", ("kotlin", "kt")),
    ("Swift", "programming_language", ("swift",)),
    ("Scala", "programming_language", ("scala",)),
    ("R", "programming_language", ("r",)),
    ("SQL", "database", ("sql",)),
    ("Django", "framework", ("django",)),
    ("Django REST Framework", "framework", ("django rest framework", "drf")),
    ("FastAPI", "framework", ("fastapi", "fast api")),
    ("Flask", "framework", ("flask",)),
    ("Ruby on Rails", "framework", ("ruby on rails", "rails", "ror")),
    ("Spring Boot", "framework", ("spring boot", "springboot", "spring")),
    ("React", "framework", ("react", "react.js", "reactjs")),
    ("Next.js", "framework", ("next.js", "nextjs")),
    ("Tailwind CSS", "framework", ("tailwind css", "tailwind", "tw")),
    ("Node.js", "framework", ("node.js", "nodejs", "node")),
    ("Express", "framework", ("express", "express.js", "expressjs")),
    ("Vue.js", "framework", ("vue", "vue.js", "vuejs")),
    ("Angular", "framework", ("angular", "ng")),
    ("Svelte", "framework", ("svelte", "sveltekit")),
    (".NET", "framework", (".net", "dotnet", "asp.net")),
    ("HTML5", "programming_language", ("html5", "html")),
    ("CSS3", "programming_language", ("css3", "css")),
    ("PostgreSQL", "database", ("postgresql", "postgres", "pg")),
    ("MySQL", "database", ("mysql",)),
    ("MongoDB", "database", ("mongodb", "mongo db", "mongo")),
    ("Redis", "database", ("redis",)),
    ("Supabase", "database", ("supabase",)),
    ("SQLite", "database", ("sqlite",)),
    ("Elasticsearch", "database", ("elasticsearch", "elastic search", "es")),
    ("DynamoDB", "database", ("dynamodb", "dynamo db")),
    ("AWS", "cloud", ("aws", "amazon web services")),
    ("Azure", "cloud", ("azure", "microsoft azure")),
    ("Google Cloud", "cloud", ("google cloud", "gcp", "google cloud platform")),
    ("Docker", "devops", ("docker",)),
    ("Kubernetes", "devops", ("kubernetes", "k8s", "kube")),
    ("GitHub Actions", "devops", ("github actions", "gha")),
    ("Terraform", "devops", ("terraform", "tf")),
    ("Ansible", "devops", ("ansible",)),
    ("Jenkins", "devops", ("jenkins",)),
    ("Vercel", "devops", ("vercel",)),
    ("Railway", "devops", ("railway",)),
    ("Nginx", "devops", ("nginx",)),
    ("Ollama", "tool", ("ollama",)),
    ("Claude Code", "tool", ("claude code",)),
    ("OpenAI Codex", "tool", ("openai codex", "codex")),
    ("Gemini API", "tool", ("gemini api", "gemini")),
    ("Playwright", "tool", ("playwright",)),
    ("CodeRabbit", "tool", ("coderabbit", "code rabbit")),
    ("Testsprite", "tool", ("testsprite",)),
    ("Postman", "tool", ("postman",)),
    ("Firebase", "tool", ("firebase",)),
    ("IPFS", "tool", ("ipfs",)),
    ("Ethereum", "domain", ("ethereum", "eth")),
    ("Solidity", "programming_language", ("solidity",)),
    ("MetaMask", "tool", ("metamask", "meta mask")),
    ("REST APIs", "domain", ("rest apis", "rest api", "restful")),
    ("GraphQL", "domain", ("graphql", "gql")),
    ("Celery", "tool", ("celery",)),
    ("Git", "tool", ("git",)),
    ("GitHub", "tool", ("github", "gh")),
    ("CI/CD", "devops", ("ci/cd", "continuous integration", "continuous delivery")),
    ("Machine Learning", "domain", ("machine learning", "ml")),
    ("NLP", "domain", ("nlp", "natural language processing")),
    ("Data Analysis", "domain", ("data analysis", "data analytics")),
    ("Apache Kafka", "tool", ("kafka", "apache kafka")),
    ("RabbitMQ", "tool", ("rabbitmq", "rabbit mq")),
    ("Linux", "tool", ("linux", "unix")),
    ("System Design", "domain", ("system design", "systems design")),
    ("Microservices", "domain", ("microservices", "micro services")),
    ("Figma", "tool", ("figma",)),
    ("Jira", "tool", ("jira",)),
    ("Agile", "domain", ("agile", "scrum")),
]


MONTHS = {
    "jan": "01",
    "january": "01",
    "feb": "02",
    "february": "02",
    "mar": "03",
    "march": "03",
    "apr": "04",
    "april": "04",
    "may": "05",
    "jun": "06",
    "june": "06",
    "jul": "07",
    "july": "07",
    "aug": "08",
    "august": "08",
    "sep": "09",
    "sept": "09",
    "september": "09",
    "oct": "10",
    "october": "10",
    "nov": "11",
    "november": "11",
    "dec": "12",
    "december": "12",
}


def normalize_resume_date(value: Any, allow_present: bool = False) -> str | None:
    if value is None:
        return None

    text = str(value).strip().lower()
    if not text or text in {"n/a", "na", "none", "null", "-"}:
        return None
    if allow_present and text in {"present", "current", "now", "ongoing"}:
        return "present"

    if match := re.match(r"^(\d{4})-(\d{2})(?:-\d{2})?$", text):
        return f"{match.group(1)}-{match.group(2)}"
    if match := re.match(r"^(\d{4})$", text):
        return f"{match.group(1)}-01"
    if match := re.match(r"^(\d{1,2})[/-](\d{4})$", text):
        month = int(match.group(1))
        if 1 <= month <= 12:
            return f"{match.group(2)}-{month:02d}"
    if match := re.match(r"^([a-zA-Z]+)\s+(\d{4})$", text):
        month = MONTHS.get(match.group(1).lower())
        if month:
            return f"{match.group(2)}-{month}"
    if match := re.match(r"^(\d{4})\s+([a-zA-Z]+)$", text):
        month = MONTHS.get(match.group(2).lower())
        if month:
            return f"{match.group(1)}-{month}"

    return None


def parse_resume_text(raw_text: str) -> ParseResult:
    cleaned_text = normalize_resume_text(raw_text)
    if not cleaned_text:
        raise ValueError("Resume has no extractable text.")

    validation_errors = []
    for model in llm_parse_models():
        try:
            payload, token_usage = request_ollama_parse(cleaned_text, model)
            validated = validate_parsed_payload(payload)
            validated = ground_parsed_resume(validated, cleaned_text)
            return ParseResult(
                data=validated.model_dump(by_alias=True),
                confidence=validated.metadata.parsing_confidence,
                model=model,
                token_usage=token_usage,
            )
        except (httpx.HTTPError, json.JSONDecodeError, ValidationError, ValueError) as exc:
            validation_errors.append(f"{model}: {exc}")

    fallback = build_heuristic_parse(cleaned_text, "; ".join(validation_errors))
    return ParseResult(
        data=fallback.model_dump(by_alias=True),
        confidence=fallback.metadata.parsing_confidence,
        model="heuristic-fallback",
        validation_errors=validation_errors,
    )


def normalize_resume_text(raw_text: str) -> str:
    text = re.sub(r"\r\n?", "\n", raw_text or "")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def llm_parse_models() -> list[str]:
    configured = [
        getattr(settings, "LLM_MODEL", "gpt-oss:20b"),
        *getattr(settings, "LLM_FALLBACK_MODELS", []),
    ]
    models = []
    for model in configured:
        model = str(model or "").strip()
        if model and model not in models:
            models.append(model)
    return models


def request_ollama_parse(raw_text: str, model: str) -> tuple[dict[str, Any], dict[str, Any]]:
    prompt = PROMPT_TEMPLATE.format(raw_text=raw_text[:24000])
    headers = {}
    if getattr(settings, "OLLAMA_API_KEY", ""):
        headers["Authorization"] = f"Bearer {settings.OLLAMA_API_KEY}"

    last_json_error: json.JSONDecodeError | None = None
    for num_predict in ollama_num_predict_attempts():
        response = httpx.post(
            f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/generate",
            headers=headers,
            json={
                "model": model,
                "prompt": prompt,
                "stream": False,
                "format": "json",
                "options": {
                    "temperature": 0,
                    "top_p": 0.7,
                    "num_predict": num_predict,
                },
            },
            timeout=getattr(settings, "OLLAMA_TIMEOUT_SECONDS", 120),
        )
        response.raise_for_status()
        body = response.json()
        raw_response = str(body.get("response", "")).strip()

        if not raw_response:
            raise ValueError(
                f"Model '{model}' returned an empty response "
                f"(done_reason={body.get('done_reason')!r}). "
                "The model may be unavailable or the prompt too large."
            )

        # If the model hit the token limit the JSON is truncated; retry with
        # more tokens before attempting to decode the incomplete fragment.
        if body.get("done_reason") == "length":
            last_json_error = json.JSONDecodeError(
                f"Response truncated at {num_predict} tokens (done_reason='length')",
                raw_response,
                len(raw_response),
            )
            continue

        try:
            parsed = parse_json_object(raw_response)
        except json.JSONDecodeError as exc:
            last_json_error = exc
            continue

        token_usage = {
            "prompt_eval_count": body.get("prompt_eval_count"),
            "eval_count": body.get("eval_count"),
            "total_duration": body.get("total_duration"),
        }
        return parsed, {key: value for key, value in token_usage.items() if value is not None}

    if last_json_error:
        raise last_json_error
    raise ValueError("Ollama returned an empty response.")


def ollama_num_predict_attempts() -> list[int]:
    configured = int(getattr(settings, "OLLAMA_NUM_PREDICT", 4096))
    retry = max(configured * 2, 8192)
    attempts = []
    for value in (configured, retry):
        if value > 0 and value not in attempts:
            attempts.append(value)
    return attempts


def parse_json_object(value: str | dict[str, Any]) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    text = value.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?", "", text).strip()
        text = re.sub(r"```$", "", text).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError as original_error:
        for candidate in json_object_candidates(text):
            for candidate_text in (candidate, repair_json_text(candidate)):
                if candidate_text and candidate_text != text:
                    try:
                        parsed = json.loads(candidate_text)
                    except json.JSONDecodeError:
                        continue
                    if isinstance(parsed, dict):
                        return parsed
        raise original_error


def json_object_candidates(text: str) -> list[str]:
    candidates = []
    for candidate in reversed(extract_balanced_json_objects(text)):
        if candidate not in candidates:
            candidates.append(candidate)

    extracted = extract_json_object_text(text)
    if extracted != text and extracted not in candidates:
        candidates.append(extracted)
    return candidates


def extract_balanced_json_objects(text: str) -> list[str]:
    candidates: list[str] = []
    stack_depth = 0
    start: int | None = None
    in_string = False
    escaped = False

    for index, char in enumerate(text):
        if in_string:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False
            continue

        if char == '"':
            in_string = True
            continue
        if char == "{":
            if stack_depth == 0:
                start = index
            stack_depth += 1
            continue
        if char == "}" and stack_depth:
            stack_depth -= 1
            if stack_depth == 0 and start is not None:
                candidates.append(text[start : index + 1])
                start = None

    return candidates


def extract_json_object_text(text: str) -> str:
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return text
    return text[start : end + 1]


def repair_json_text(text: str) -> str:
    return re.sub(r",\s*([}\]])", r"\1", text)


def validate_parsed_payload(payload: dict[str, Any]) -> ParsedResumeSchema:
    data = sanitize_parsed_payload(payload)
    if "_metadata" not in data:
        data["_metadata"] = {}
    validated = ParsedResumeSchema.model_validate(data)
    notes = list(validated.metadata.parsing_notes)
    if not validated.personal_info.full_name:
        notes.append("Missing full name.")
    if not validated.skills:
        notes.append("No skills extracted.")
    validated.metadata.parsing_confidence = estimate_confidence(validated, notes)
    validated.metadata.parsing_notes = notes
    return validated


def ground_parsed_resume(parsed: ParsedResumeSchema, raw_text: str) -> ParsedResumeSchema:
    notes = list(parsed.metadata.parsing_notes)
    raw_lower = raw_text.lower()
    sections = extract_sections(raw_text)

    source_name = infer_full_name(raw_text)
    source_email = find_first(EMAIL_RE, raw_text)
    source_phone = find_first(PHONE_RE, raw_text)
    linkedin_url = find_profile_url(raw_text, "linkedin")
    github_url = find_profile_url(raw_text, "github")
    portfolio_url = find_portfolio_url(raw_text)

    if source_name and not value_supported(parsed.personal_info.full_name, raw_lower):
        parsed.personal_info.full_name = source_name
    if source_email:
        parsed.personal_info.email = source_email
    if source_phone:
        parsed.personal_info.phone = source_phone
    if linkedin_url:
        parsed.personal_info.linkedin_url = linkedin_url
    elif not value_supported(parsed.personal_info.linkedin_url, raw_lower):
        parsed.personal_info.linkedin_url = None
    if github_url:
        parsed.personal_info.github_url = github_url
    elif not value_supported(parsed.personal_info.github_url, raw_lower):
        parsed.personal_info.github_url = None
    if portfolio_url:
        parsed.personal_info.portfolio_url = portfolio_url
    elif not value_supported(parsed.personal_info.portfolio_url, raw_lower):
        parsed.personal_info.portfolio_url = None

    if not parsed.summary or not value_supported(parsed.summary, raw_lower):
        parsed.summary = infer_summary(sections)

    grounded_skills = []
    dropped_skills = []
    for skill in parsed.skills:
        if skill_supported(skill.name, raw_text):
            grounded_skills.append(skill)
        else:
            dropped_skills.append(skill.name)

    grounded_skills.extend(infer_skill_models(raw_text))
    parsed.skills = dedupe_skill_models(grounded_skills)
    if dropped_skills:
        notes.append(f"Removed unsupported skills: {', '.join(dropped_skills[:6])}.")

    parsed.experience = [
        item for item in parsed.experience if experience_supported(item, raw_lower)
    ]
    parsed.projects = merge_projects(
        [item for item in parsed.projects if project_supported(item, raw_lower)],
        infer_projects(sections, raw_text),
    )
    parsed.education = merge_education(
        [item for item in parsed.education if education_supported(item, raw_lower)],
        infer_education(sections),
    )
    parsed.certifications = merge_certifications(
        [item for item in parsed.certifications if certification_supported(item, raw_lower)],
        infer_certifications(sections),
    )
    parsed.languages = [
        item for item in parsed.languages if language_supported(item, raw_lower)
    ]

    if not parsed.personal_info.full_name:
        notes.append("Missing full name.")
    if not parsed.skills:
        notes.append("No source-grounded skills extracted.")

    parsed.metadata.parsing_notes = clean_parsing_notes(parsed, notes)
    parsed.metadata.parsing_confidence = estimate_confidence(
        parsed,
        parsed.metadata.parsing_notes,
    )
    return parsed


def sanitize_parsed_payload(payload: dict[str, Any]) -> dict[str, Any]:
    data = dict(payload or {})
    data.setdefault("personal_info", {})
    data.setdefault("skills", [])
    data.setdefault("experience", [])
    data.setdefault("projects", [])
    data.setdefault("education", [])
    data.setdefault("certifications", [])
    data.setdefault("languages", [])
    data.setdefault("_metadata", {})

    data["skills"] = dedupe_items(data.get("skills"), key="name")
    data["experience"] = [
        item
        for item in ensure_list(data.get("experience"))
        if has_any_value(item, "company", "role")
    ]
    data["projects"] = [
        item
        for item in ensure_list(data.get("projects"))
        if has_any_value(item, "name")
    ]
    data["education"] = [
        item
        for item in ensure_list(data.get("education"))
        if has_any_value(item, "institution", "degree")
    ]
    data["certifications"] = [
        item for item in ensure_list(data.get("certifications")) if has_any_value(item, "name")
    ]
    data["languages"] = [
        item for item in ensure_list(data.get("languages")) if has_any_value(item, "language")
    ]
    return data


def ensure_list(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, dict)]


def has_any_value(item: dict[str, Any], *keys: str) -> bool:
    return any(str(item.get(key) or "").strip() for key in keys)


def dedupe_items(value: Any, key: str) -> list[dict[str, Any]]:
    items = ensure_list(value)
    seen = set()
    deduped = []
    for item in items:
        name = str(item.get(key) or "").strip()
        if not name:
            continue
        normalized = name.lower()
        if normalized in seen:
            continue
        seen.add(normalized)
        item[key] = name
        deduped.append(item)
    return deduped


def estimate_confidence(parsed: ParsedResumeSchema, notes: list[str]) -> Confidence:
    score = 0
    if parsed.personal_info.full_name:
        score += 2
    if parsed.personal_info.email or parsed.personal_info.phone:
        score += 2
    if len(parsed.skills) >= 5:
        score += 3
    elif parsed.skills:
        score += 2
    if parsed.experience:
        score += 2
    if parsed.projects:
        score += 2
    if parsed.education:
        score += 1

    if len(notes) > 2:
        score -= 2
    elif notes:
        score -= 1

    if score >= 7:
        return "high"
    if score >= 3:
        return "medium"
    return "low"


def dedupe_notes(notes: list[str]) -> list[str]:
    deduped = []
    seen = set()
    for note in notes:
        normalized = note.strip()
        if not normalized or normalized.lower() in seen:
            continue
        seen.add(normalized.lower())
        deduped.append(normalized)
    return deduped


def clean_parsing_notes(parsed: ParsedResumeSchema, notes: list[str]) -> list[str]:
    cleaned = []
    for note in notes:
        normalized = note.strip().lower()
        if normalized == "missing full name." and parsed.personal_info.full_name:
            continue
        if normalized == "no skills extracted." and parsed.skills:
            continue
        if normalized == "no source-grounded skills extracted." and parsed.skills:
            continue
        cleaned.append(note)
    return dedupe_notes(cleaned)


SECTION_ALIASES = {
    "summary": "summary",
    "profile": "summary",
    "objective": "summary",
    "technical skills": "skills",
    "skills": "skills",
    "experience": "experience",
    "work experience": "experience",
    "professional experience": "experience",
    "projects": "projects",
    "project": "projects",
    "education": "education",
    "certifications": "certifications",
    "certification": "certifications",
    "licenses & certifications": "certifications",
    "leadership & activities": "activities",
    "leadership": "activities",
    "activities": "activities",
    "languages": "languages",
}


def extract_sections(raw_text: str) -> dict[str, list[str]]:
    sections: dict[str, list[str]] = {}
    current: str | None = None
    for raw_line in raw_text.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        heading = SECTION_ALIASES.get(line.lower().strip(":"))
        if heading:
            current = heading
            sections.setdefault(current, [])
            continue

        if current:
            sections.setdefault(current, []).append(line)

    return sections


def infer_summary(sections: dict[str, list[str]]) -> str | None:
    summary_lines = sections.get("summary", [])
    if not summary_lines:
        return None
    return " ".join(summary_lines).strip() or None


def infer_education(sections: dict[str, list[str]]) -> list[Education]:
    lines = sections.get("education", [])
    if not lines:
        return []

    items: list[Education] = []
    index = 0
    while index < len(lines):
        line = lines[index]
        year_match = re.search(r"(20\d{2}|19\d{2})(?:\s*[–-]\s*(20\d{2}|present))?", line, re.I)
        if not year_match:
            index += 1
            continue

        degree_text = line[: year_match.start()].strip(" \t-–")
        institution_line = lines[index + 1] if index + 1 < len(lines) else ""
        institution = institution_line.split("·", 1)[0].strip()
        degree, field = split_degree_field(degree_text)
        graduation_year = int(year_match.group(2) or year_match.group(1))

        if institution or degree:
            items.append(
                Education(
                    institution=institution,
                    degree=degree,
                    field_of_study=field,
                    graduation_year=graduation_year,
                )
            )
        index += 2

    return items


def split_degree_field(value: str) -> tuple[str | None, str | None]:
    text = value.strip()
    if not text:
        return None, None
    parts = [part.strip() for part in re.split(r"\s+[–-]\s+", text, maxsplit=1)]
    if len(parts) == 2:
        return parts[0], parts[1]
    degree_pattern = (
        r"^((?:B|M|Ph)\.?[A-Za-z.]*|B\.Tech|M\.Tech|BE|ME|BS|MS|BSc|MSc)\s+(.+)$"
    )
    if match := re.match(degree_pattern, text, re.I):
        return match.group(1), match.group(2)
    return text, None


def infer_certifications(sections: dict[str, list[str]]) -> list[Certification]:
    lines = sections.get("certifications", [])
    items: list[Certification] = []
    for line in lines:
        if line.lower().startswith(("score:", "credits:", "issued by")):
            continue
        year_match = re.search(r"(20\d{2}|19\d{2})", line)
        year = int(year_match.group(1)) if year_match else None
        title = line[: year_match.start()].strip(" \t-–") if year_match else line
        name, issuer = split_certification_title(title)
        if name:
            items.append(Certification(name=name, issuer=issuer, year=year))
    return items


def split_certification_title(value: str) -> tuple[str, str | None]:
    parts = [part.strip() for part in re.split(r"\s+[—–-]\s+", value, maxsplit=1)]
    if len(parts) == 2:
        return parts[0], clean_certification_issuer(parts[1]) or None
    return value.strip(), None


def clean_certification_issuer(value: str | None) -> str | None:
    if not value:
        return None
    text = value.strip()
    text = re.sub(
        r"\s+(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|"
        r"aug|august|sep|sept|september|oct|october|nov|november|dec|december)$",
        "",
        text,
        flags=re.I,
    )
    return text.strip() or None


def infer_projects(sections: dict[str, list[str]], raw_text: str) -> list[Project]:
    lines = sections.get("projects", [])
    projects: list[Project] = []
    current: Project | None = None

    for line in lines:
        if header := parse_project_header(line):
            if current:
                projects.append(current)
            name, start_date, end_date = header
            current = Project(name=name, start_date=start_date, end_date=end_date)
            continue

        if not current:
            continue

        if not current.technologies and looks_like_technology_line(line):
            current.technologies = split_technology_line(line, raw_text)
            url = first_supported_url(line)
            if url:
                current.url = ensure_url_scheme(url)
            continue

        current.achievements.append(line.lstrip("•- ").strip())

    if current:
        projects.append(current)

    for project in projects:
        if project.achievements and not project.description:
            project.description = project.achievements[0]
    return projects


def parse_project_header(line: str) -> tuple[str, str | None, str | None] | None:
    match = re.match(
        r"^(.+?)\s+(20\d{2}|19\d{2})\s*[–-]\s*((?:20\d{2}|19\d{2})|present)$",
        line,
        re.I,
    )
    if not match:
        return None
    return match.group(1).strip(), normalize_resume_date(match.group(2)), normalize_resume_date(
        match.group(3),
        allow_present=True,
    )


def looks_like_technology_line(line: str) -> bool:
    if "·" in line or "|" in line:
        return True
    return sum(1 for skill in infer_skill_models(line) if skill.name) >= 2


def split_technology_line(line: str, raw_text: str) -> list[str]:
    without_url = re.sub(URL_RE, "", line, flags=re.I)
    parts = [
        part.strip()
        for part in re.split(r"\s*[·|,]\s*", without_url)
        if part.strip()
    ]
    skills = [part for part in parts if skill_supported(part, raw_text)]
    return dedupe_strings(skills)


def first_supported_url(text: str) -> str | None:
    urls = find_urls(text)
    return urls[0] if urls else None


def dedupe_strings(values: list[str]) -> list[str]:
    seen = set()
    deduped = []
    for value in values:
        normalized = normalize_for_match(value)
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        deduped.append(value)
    return deduped


def merge_projects(parsed: list[Project], inferred: list[Project]) -> list[Project]:
    by_name = {normalize_for_match(item.name): item for item in parsed if item.name}
    for item in inferred:
        key = normalize_for_match(item.name)
        if not key:
            continue
        if key in by_name:
            existing = by_name[key]
            existing.start_date = existing.start_date or item.start_date
            existing.end_date = existing.end_date or item.end_date
            existing.description = existing.description or item.description
            existing.technologies = existing.technologies or item.technologies
            existing.achievements = existing.achievements or item.achievements
            existing.url = existing.url or item.url
        else:
            by_name[key] = item
    return list(by_name.values())


def merge_education(parsed: list[Education], inferred: list[Education]) -> list[Education]:
    merged: list[Education] = []
    for item in parsed:
        if item.institution or item.degree:
            add_or_merge_education(merged, item)
    for item in inferred:
        add_or_merge_education(merged, item)
    return merged


def add_or_merge_education(items: list[Education], item: Education) -> None:
    for existing in items:
        if education_items_match(existing, item):
            if len(item.institution) > len(existing.institution):
                existing.institution = item.institution
            existing.degree = existing.degree or item.degree
            existing.field_of_study = existing.field_of_study or item.field_of_study
            existing.graduation_year = existing.graduation_year or item.graduation_year
            existing.gpa = existing.gpa or item.gpa
            return
    items.append(item)


def education_items_match(left: Education, right: Education) -> bool:
    left_institution = normalize_institution(left.institution)
    right_institution = normalize_institution(right.institution)
    same_institution = bool(
        left_institution
        and right_institution
        and (left_institution in right_institution or right_institution in left_institution)
    )
    same_degree = normalize_for_match(left.degree or "") == normalize_for_match(right.degree or "")
    same_year = bool(
        left.graduation_year
        and right.graduation_year
        and left.graduation_year == right.graduation_year
    )
    # A partial heuristic entry (no institution) for the same year is the same
    # record as a fuller LLM entry — match on year so it merges instead of
    # producing a duplicate education row.
    if same_year and not (left_institution and right_institution):
        return True
    return same_institution and (same_degree or same_year)


def normalize_institution(value: str) -> str:
    return normalize_for_match(value.split(",", 1)[0])


def merge_certifications(
    parsed: list[Certification],
    inferred: list[Certification],
) -> list[Certification]:
    by_name = {}
    for item in parsed:
        if not item.name:
            continue
        item.name, issuer_from_name = split_certification_title(item.name)
        item.issuer = item.issuer or issuer_from_name
        item.issuer = clean_certification_issuer(item.issuer)
        by_name[certification_key(item.name)] = item

    for item in inferred:
        item.name, issuer_from_name = split_certification_title(item.name)
        item.issuer = clean_certification_issuer(item.issuer or issuer_from_name)
        key = certification_key(item.name)
        if not key:
            continue
        if key in by_name:
            existing = by_name[key]
            existing.issuer = existing.issuer or item.issuer
            existing.year = existing.year or item.year
        else:
            by_name[key] = item
    return list(by_name.values())


def certification_key(name: str) -> str:
    return normalize_for_match(split_certification_title(name)[0])


def infer_full_name(raw_text: str) -> str | None:
    for raw_line in raw_text.splitlines()[:12]:
        line = raw_line.strip(" \t|•-")
        normalized = line.lower().strip(":")
        if not line or normalized in SECTION_HEADINGS:
            continue
        if re.search(EMAIL_RE, line) or re.search(PHONE_RE, line) or re.search(URL_RE, line):
            continue
        if len(line) > 80 or sum(char.isdigit() for char in line) > 1:
            continue
        words = [word for word in re.split(r"\s+", line) if word]
        if 2 <= len(words) <= 5 and all(re.search(r"[A-Za-z]", word) for word in words):
            return line
    return None


def find_profile_url(raw_text: str, provider: str) -> str | None:
    for url in find_urls(raw_text):
        if provider in url.lower():
            return ensure_url_scheme(url)
    return None


def find_portfolio_url(raw_text: str) -> str | None:
    for url in find_urls(raw_text):
        lower_url = url.lower()
        if "linkedin" not in lower_url and "github" not in lower_url:
            return ensure_url_scheme(url)
    return None


def find_urls(raw_text: str) -> list[str]:
    urls = []
    for match in re.finditer(URL_RE, raw_text, re.I):
        url = match.group(0).rstrip(".,)")
        if is_supported_url_candidate(url):
            urls.append(url)
    return urls


def is_supported_url_candidate(url: str) -> bool:
    lower_url = url.lower()
    blocked_exact = {
        "react.js",
        "next.js",
        "node.js",
        "express.js",
        "vue.js",
    }
    host = lower_url.split("/", 1)[0]
    if lower_url in blocked_exact or host in blocked_exact:
        return False
    if re.match(r"^https?://", lower_url) or lower_url.startswith("www."):
        return True
    return "/" in lower_url


def ensure_url_scheme(url: str) -> str:
    return url if re.match(r"^https?://", url, re.I) else f"https://{url}"


def value_supported(value: str | None, raw_lower: str) -> bool:
    if not value:
        return False
    normalized = normalize_for_match(value)
    return bool(normalized and normalized in normalize_for_match(raw_lower))


def normalize_for_match(value: str) -> str:
    return re.sub(r"\s+", " ", value.lower().strip())


def skill_supported(skill_name: str, raw_text: str) -> bool:
    raw_lower = raw_text.lower()
    normalized_skill = skill_name.lower().strip()
    if value_supported(normalized_skill, raw_lower):
        return True

    for canonical, _category, aliases in KNOWN_SKILLS:
        if canonical.lower() == normalized_skill:
            return any(alias_supported(alias, raw_text) for alias in aliases)

    return False


def alias_supported(alias: str, raw_text: str) -> bool:
    if re.search(r"^[a-z0-9+#.]+$", alias, flags=re.I):
        pattern = rf"(?<![A-Za-z0-9+#]){re.escape(alias)}(?![A-Za-z0-9+#])"
        return bool(re.search(pattern, raw_text, re.I))
    return value_supported(alias, raw_text.lower())


def infer_skill_models(raw_text: str) -> list[Skill]:
    skills = []
    for canonical, category, aliases in KNOWN_SKILLS:
        if any(alias_supported(alias, raw_text) for alias in aliases):
            skills.append(Skill(name=canonical, proficiency="intermediate", category=category))
    return skills


def dedupe_skill_models(skills: list[Skill]) -> list[Skill]:
    seen = set()
    deduped = []
    for skill in skills:
        skill = canonicalize_skill(skill)
        key = skill.name.strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        skill.name = skill.name.strip()
        deduped.append(skill)
    return deduped


def canonicalize_skill(skill: Skill) -> Skill:
    name = skill.name.strip()
    for canonical, category, aliases in KNOWN_SKILLS:
        candidates = (canonical, *aliases)
        if any(
            normalize_for_match(name) == normalize_for_match(candidate)
            for candidate in candidates
        ):
            skill.name = canonical
            skill.category = category
            return skill
    skill.name = name
    return skill


def experience_supported(item: Experience, raw_lower: str) -> bool:
    return any(
        value_supported(value, raw_lower)
        for value in (item.company, item.role)
        if value
    )


def education_supported(item: Education, raw_lower: str) -> bool:
    return any(
        value_supported(value, raw_lower)
        for value in (item.institution, item.degree, item.field_of_study)
        if value
    )


def project_supported(item: Project, raw_lower: str) -> bool:
    return any(
        value_supported(value, raw_lower)
        for value in (item.name, item.description, item.url)
        if value
    )


def certification_supported(item: Certification, raw_lower: str) -> bool:
    return any(
        value_supported(value, raw_lower)
        for value in (item.name, item.issuer)
        if value
    )


HUMAN_LANGUAGES = {
    # Indian languages
    "english",
    "hindi",
    "malayalam",
    "tamil",
    "kannada",
    "telugu",
    "marathi",
    "bengali",
    "gujarati",
    "punjabi",
    "urdu",
    "odia",
    "assamese",
    "konkani",
    "sanskrit",
    "nepali",
    "sinhala",
    # World languages
    "french",
    "german",
    "spanish",
    "arabic",
    "mandarin",
    "chinese",
    "cantonese",
    "japanese",
    "korean",
    "portuguese",
    "russian",
    "italian",
    "dutch",
    "swedish",
    "polish",
    "turkish",
    "vietnamese",
    "thai",
    "indonesian",
    "malay",
    "filipino",
    "tagalog",
    "persian",
    "farsi",
    "hebrew",
    "greek",
    "ukrainian",
    "romanian",
    "czech",
    "hungarian",
    "finnish",
    "norwegian",
    "danish",
    "swahili",
}


def language_supported(item: Language, raw_lower: str) -> bool:
    language = normalize_for_match(item.language)
    return language in HUMAN_LANGUAGES and value_supported(item.language, raw_lower)


def build_heuristic_parse(raw_text: str, reason: str) -> ParsedResumeSchema:
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    sections = extract_sections(raw_text)
    email = find_first(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+", raw_text)
    phone = find_first(r"(?:\+?\d[\d\s().-]{7,}\d)", raw_text)
    full_name = infer_full_name(raw_text) or (lines[0] if lines else None)
    skills = [
        Skill(name=name, proficiency="intermediate", category="other")
        for name in infer_skills(raw_text)
    ]
    parsed = ParsedResumeSchema(
        personal_info=PersonalInfo(full_name=full_name, email=email, phone=phone),
        summary=infer_summary(sections),
        skills=skills,
        experience=[],
        projects=infer_projects(sections, raw_text),
        education=infer_education(sections),
        certifications=infer_certifications(sections),
        languages=[],
        metadata=ParseMetadata(
            parsing_confidence="low",
            parsing_notes=[
                fallback_reason(reason),
            ],
        ),
    )
    parsed.metadata.parsing_confidence = estimate_confidence(parsed, parsed.metadata.parsing_notes)
    return parsed


def fallback_reason(reason: str) -> str:
    local_connection_error = "connection" in reason.lower() or "winerror 10061" in reason.lower()
    if local_connection_error:
        return "Local LLM was unavailable; used deterministic fallback extraction."
    return "LLM parsing failed; used deterministic fallback extraction."


def find_first(pattern: str, text: str) -> str | None:
    match = re.search(pattern, text, flags=re.IGNORECASE)
    return match.group(0).strip() if match else None


def infer_skills(text: str) -> list[str]:
    return [skill.name for skill in infer_skill_models(text)]
