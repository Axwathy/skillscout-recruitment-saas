"use client";

import React, { useState, useCallback } from "react";
import { useDropzone, FileRejection } from "react-dropzone";
import { UploadCloud, File as FileIcon, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api/client";

type UploadStatus = "idle" | "uploading" | "success" | "error";

interface UploadedFile {
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
  id?: string; // assigned by backend if success
}

interface ResumeUploadProps {
  candidateId?: string;
  applicationId?: string;
  isCandidateMode?: boolean;
  onUploadSuccess?: () => void;
}

export function ResumeUpload({
  candidateId,
  applicationId,
  isCandidateMode,
  onUploadSuccess,
}: ResumeUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const updateFileState = useCallback((fileName: string, updates: Partial<UploadedFile>) => {
    setFiles((prev) =>
      prev.map((f) => (f.file.name === fileName ? { ...f, ...updates } : f))
    );
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    // Update status to uploading
    updateFileState(file.name, { status: "uploading", progress: 25 });

    const formData = new FormData();
    formData.append("file", file);
    
    let endpoint = "";
    if (isCandidateMode) {
      if (applicationId) {
        formData.append("application_id", applicationId);
      }
      endpoint = "/api/v1/candidate/me/resumes/upload/";
    } else if (candidateId) {
      // Recruiter uploading for a candidate
      formData.append("candidate_id", candidateId);
      if (applicationId) {
        formData.append("application_id", applicationId);
      }
      endpoint = "/api/v1/applications/candidates/resumes/upload/";
    } else {
      updateFileState(file.name, {
        status: "error",
        progress: 0,
        error: "Open an application before uploading a resume.",
      });
      return;
    }

    try {
      updateFileState(file.name, { progress: 60 });
      const res = await apiClient.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      updateFileState(file.name, { status: "success", progress: 100, id: res.data.id });
      if (onUploadSuccess) onUploadSuccess();
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Upload failed. Please try again.";
      updateFileState(file.name, { status: "error", progress: 0, error: msg });
    }
  }, [
    applicationId,
    candidateId,
    isCandidateMode,
    onUploadSuccess,
    updateFileState,
  ]);

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      status: "idle" as UploadStatus,
      progress: 0,
    }));
    
    // Add errors for rejected files (like size or type)
    const rejectedFiles = fileRejections.map(({ file, errors }) => ({
      file,
      status: "error" as UploadStatus,
      progress: 0,
      error: errors[0]?.message || "Invalid file",
    }));

    setFiles((prev) => [...prev, ...newFiles, ...rejectedFiles]);

    // Automatically start uploading the valid ones
    newFiles.forEach((f) => uploadFile(f.file));
  }, [uploadFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/msword": [".doc"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const removeFile = (fileName: string) => {
    setFiles((prev) => prev.filter((f) => f.file.name !== fileName));
  };

  return (
    <div className="w-full space-y-4">
      <div
        {...getRootProps()}
        className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-all duration-200 ${
          isDragActive
            ? "border-primary-500 bg-primary-50"
            : "border-neutral-300 bg-neutral-50/50 hover:border-primary-400 hover:bg-neutral-50"
        }`}
      >
        <input {...getInputProps()} />
        <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-full transition-transform duration-200 ${isDragActive ? "scale-110 bg-primary-100" : "bg-white shadow-sm ring-1 ring-neutral-200 group-hover:scale-110"}`}>
          <UploadCloud className={`h-7 w-7 ${isDragActive ? "text-primary-600" : "text-neutral-500"}`} />
        </div>
        <h3 className="text-sm font-semibold text-neutral-900">
          {isDragActive ? "Drop resumes here..." : "Click or drag files to upload"}
        </h3>
        <p className="mt-1.5 text-xs text-neutral-500 max-w-xs mx-auto">
          Upload PDF or DOCX format resumes. Max size 10MB per file.
        </p>
      </div>

      {files.length > 0 && (
        <ul className="space-y-3">
          {files.map((fileObj) => (
            <li
              key={fileObj.file.name}
              className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center gap-4 overflow-hidden">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
                  <FileIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-900">
                    {fileObj.file.name}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {(fileObj.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 ml-4">
                {fileObj.status === "uploading" && (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
                    <span className="text-xs font-medium text-primary-600">{fileObj.progress}%</span>
                  </div>
                )}
                {fileObj.status === "success" && (
                  <CheckCircle2 className="h-5 w-5 text-success-500" />
                )}
                {fileObj.status === "error" && (
                  <div className="flex items-center gap-2" title={fileObj.error}>
                    <AlertCircle className="h-5 w-5 text-danger-500" />
                    <span className="text-xs text-danger-600 hidden sm:inline-block max-w-[150px] truncate">{fileObj.error}</span>
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(fileObj.file.name);
                  }}
                  className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
