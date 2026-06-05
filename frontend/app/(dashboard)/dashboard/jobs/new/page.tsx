"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";

import { ApiError } from "@/lib/api";
import { createJob } from "@/lib/jobs";
import type { EmploymentType, JobPayload, RemotePolicy } from "@/types/jobs";

const initialForm: JobPayload = {
  title: "",
  description: "",
  requirements: "",
  location: "",
  department: "",
  employment_type: "full_time",
  remote_policy: "onsite",
  salary_range: "",
};

export default function CreateJobPage() {
  const router = useRouter();
  const [form, setForm] = useState<JobPayload>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof JobPayload>(field: K, value: JobPayload[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const job = await createJob(form);
      router.push(`/dashboard/jobs/${job.id}`);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.data?.detail || err.message
          : "Could not create job. Check the required fields and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Create job</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Start in draft, then publish when the posting is ready.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-danger-600/20 bg-danger-600/10 px-4 py-3 text-sm text-danger-600">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-md border border-neutral-200 bg-white p-6 shadow-panel"
      >
        {/* Title */}
        <label className="block">
          <span className="text-sm font-medium text-neutral-700">Title</span>
          <input
            value={form.title}
            onChange={(e) => updateField("title", e.target.value)}
            required
            className="mt-1 h-10 w-full rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-primary-500"
          />
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Location */}
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">Location</span>
            <input
              value={form.location}
              onChange={(e) => updateField("location", e.target.value)}
              required
              className="mt-1 h-10 w-full rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-primary-500"
            />
          </label>

          {/* Department */}
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">Department</span>
            <input
              value={form.department}
              onChange={(e) => updateField("department", e.target.value)}
              placeholder="e.g. Engineering, Sales, HR"
              className="mt-1 h-10 w-full rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-primary-500"
            />
          </label>

          {/* Employment type */}
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">Employment type</span>
            <select
              value={form.employment_type}
              onChange={(e) => updateField("employment_type", e.target.value as EmploymentType)}
              className="mt-1 h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-primary-500"
            >
              <option value="full_time">Full time</option>
              <option value="part_time">Part time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
            </select>
          </label>

          {/* Remote policy */}
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">Remote policy</span>
            <select
              value={form.remote_policy}
              onChange={(e) => updateField("remote_policy", e.target.value as RemotePolicy)}
              className="mt-1 h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-primary-500"
            >
              <option value="onsite">On-site</option>
              <option value="hybrid">Hybrid</option>
              <option value="remote">Remote</option>
            </select>
          </label>
        </div>

        {/* Salary range */}
        <label className="block">
          <span className="text-sm font-medium text-neutral-700">Salary range</span>
          <input
            value={form.salary_range}
            onChange={(e) => updateField("salary_range", e.target.value)}
            placeholder="$120k–$160k"
            className="mt-1 h-10 w-full rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-primary-500"
          />
        </label>

        {/* Description */}
        <label className="block">
          <span className="text-sm font-medium text-neutral-700">Description</span>
          <textarea
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            required
            rows={6}
            className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-primary-500"
          />
        </label>

        {/* Requirements */}
        <label className="block">
          <span className="text-sm font-medium text-neutral-700">Requirements</span>
          <textarea
            value={form.requirements}
            onChange={(e) => updateField("requirements", e.target.value)}
            required
            rows={5}
            placeholder="List required and preferred skills, experience, and qualifications…"
            className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-primary-500"
          />
        </label>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            {isSubmitting ? "Creating..." : "Create job"}
          </button>
        </div>
      </form>
    </div>
  );
}
