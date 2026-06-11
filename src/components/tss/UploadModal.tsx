import { useState, useCallback, useRef } from "react";
import {
  Upload,
  FileSpreadsheet,
  Calendar,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

type Step = "select" | "confirm" | "processing" | "done" | "error";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function UploadModal({ open, onClose }: Props) {
  const [step, setStep] = useState<Step>("select");
  const [file, setFile] = useState<File | null>(null);
  const [date, setDate] = useState("");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const renamedFilename = date ? `${date}_returns.xlsx` : "";

  function reset() {
    setStep("select");
    setFile(null);
    setDate("");
    setDragging(false);
    setError("");
    setStatusMsg("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  function acceptFile(f: File) {
    setError("");
    if (!f.name.endsWith(".xlsx") && !f.name.endsWith(".xls")) {
      setError("Only .xlsx or .xls files are accepted.");
      return;
    }
    setFile(f);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) acceptFile(f);
  }, []);

  async function handleUpload() {
    if (!file || !date) return;
    setStep("processing");
    setStatusMsg("Uploading file to storage…");

    try {
      const { error: uploadError } = await supabase.storage
        .from("returns-uploads")
        .upload(renamedFilename, file, { upsert: true });

      if (uploadError) throw uploadError;

      setStatusMsg("Processing file…");

      const { error: fnError } = await supabase.functions.invoke(
        "upload-pipeline",
        { body: { filename: renamedFilename } },
      );

      if (fnError) throw fnError;

      setStep("done");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStep("error");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        className="sm:max-w-md"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
      >
        <DialogHeader>
          <DialogTitle
            className="text-[13px] font-bold tracking-wide"
            style={{ color: "var(--text-primary)" }}
          >
            UPLOAD RETURNS DATA
          </DialogTitle>
        </DialogHeader>

        {/* ── Step 1: select file + date ── */}
        {step === "select" && (
          <div className="space-y-4 pt-1">
            {/* drop zone */}
            <div
              onDrop={onDrop}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onClick={() => inputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed cursor-pointer transition-colors py-10"
              style={{
                borderColor: dragging ? "var(--accent-red)" : "var(--border-color)",
                background: dragging ? "rgba(220,38,38,0.05)" : "var(--bg-page)",
              }}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) acceptFile(f); }}
              />
              {file ? (
                <>
                  <FileSpreadsheet size={30} style={{ color: "var(--accent-green)" }} />
                  <p className="text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>
                    {file.name}
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {(file.size / 1024).toFixed(1)} KB — click to change
                  </p>
                </>
              ) : (
                <>
                  <Upload size={26} style={{ color: "var(--text-muted)" }} />
                  <p className="text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>
                    Drag & drop or click to browse
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    .xlsx or .xls only
                  </p>
                </>
              )}
            </div>

            {/* date picker */}
            <div className="space-y-1.5">
              <label
                className="text-[11px] font-semibold tracking-wide"
                style={{ color: "var(--text-secondary)" }}
              >
                DATA DATE
              </label>
              <div className="relative">
                <Calendar
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: "var(--text-muted)" }}
                />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-md pl-8 pr-3 py-2 text-[12px] outline-none"
                  style={{
                    background: "var(--bg-page)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
            </div>

            {error && (
              <p className="text-[11px] font-medium" style={{ color: "var(--accent-red)" }}>
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClose}
                style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!file || !date}
                onClick={() => setStep("confirm")}
                className="disabled:opacity-40"
                style={{ background: "var(--accent-red)", color: "#fff", border: "none" }}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: confirm ── */}
        {step === "confirm" && (
          <div className="space-y-4 pt-1">
            <div
              className="rounded-lg p-4 space-y-2.5"
              style={{ background: "var(--bg-page)", border: "1px solid var(--border-color)" }}
            >
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={15} style={{ color: "var(--accent-green)" }} />
                <span className="text-[12px] font-bold" style={{ color: "var(--text-primary)" }}>
                  {renamedFilename}
                </span>
              </div>
              <div className="text-[11px] space-y-1" style={{ color: "var(--text-secondary)" }}>
                <p>
                  Original:{" "}
                  <span style={{ color: "var(--text-muted)" }}>{file?.name}</span>
                </p>
                <p>
                  Stored as:{" "}
                  <span style={{ color: "var(--accent-red)" }}>{renamedFilename}</span>
                </p>
                <p>
                  Data date:{" "}
                  <span style={{ color: "var(--text-muted)" }}>{date}</span>
                </p>
                <p>
                  Size:{" "}
                  <span style={{ color: "var(--text-muted)" }}>
                    {file ? `${(file.size / 1024).toFixed(1)} KB` : ""}
                  </span>
                </p>
              </div>
            </div>

            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              The file will be uploaded, processed into the database, then deleted from storage automatically.
            </p>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep("select")}
                style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
              >
                Back
              </Button>
              <Button
                size="sm"
                onClick={handleUpload}
                style={{ background: "var(--accent-red)", color: "#fff", border: "none" }}
              >
                Upload & Process
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: processing ── */}
        {step === "processing" && (
          <div className="flex flex-col items-center gap-3 py-10">
            <div
              className="h-8 w-8 rounded-full border-2 animate-spin"
              style={{
                borderColor: "var(--accent-red)",
                borderTopColor: "transparent",
              }}
            />
            <p className="text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>
              {statusMsg}
            </p>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              This may take a few seconds…
            </p>
          </div>
        )}

        {/* ── Step 4a: done ── */}
        {step === "done" && (
          <div className="flex flex-col items-center gap-3 py-10">
            <CheckCircle2 size={36} style={{ color: "var(--accent-green)" }} />
            <p className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>
              Upload complete
            </p>
            <p className="text-[11px] text-center" style={{ color: "var(--text-muted)" }}>
              {renamedFilename} has been processed. The dashboard will reflect the new data.
            </p>
            <Button
              size="sm"
              onClick={handleClose}
              style={{ background: "var(--accent-red)", color: "#fff", border: "none", marginTop: "0.25rem" }}
            >
              Done
            </Button>
          </div>
        )}

        {/* ── Step 4b: error ── */}
        {step === "error" && (
          <div className="flex flex-col items-center gap-3 py-10">
            <AlertCircle size={36} style={{ color: "var(--accent-red)" }} />
            <p className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>
              Upload failed
            </p>
            <p
              className="text-[11px] text-center max-w-xs"
              style={{ color: "var(--text-muted)" }}
            >
              {error}
            </p>
            <div className="flex gap-2 mt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClose}
                style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => { setStep("select"); setError(""); }}
                style={{ background: "var(--accent-red)", color: "#fff", border: "none" }}
              >
                Try Again
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
