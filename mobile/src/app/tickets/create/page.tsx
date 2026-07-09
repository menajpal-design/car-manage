"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  Camera, 
  Mic, 
  Square, 
  Trash, 
  Play, 
  Pause,
  AlertTriangle, 
  CheckCircle, 
  ArrowLeft,
  X
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { TicketType } from "@fleetmaster/shared";

interface AssignedVehicle {
  id: string;
  regNumber: string;
  currentOdometer: number;
}

export default function CreateTicketPage() {
  const router = useRouter();
  const [vehicle, setVehicle] = useState<AssignedVehicle | null>(null);

  // Form states
  const [ticketType, setTicketType] = useState<TicketType>(TicketType.OTHER);
  const [description, setDescription] = useState("");
  const [odoAtReport, setOdoAtReport] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // Voice note states
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Status states
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSync, setPendingSync] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const syncOfflineTickets = useCallback(async () => {
    const queueStr = localStorage.getItem("offline_tickets");
    if (!queueStr) return;

    try {
      const queue = JSON.parse(queueStr);
      if (queue.length === 0) return;

      console.log(`[PWA Sync] Syncing ${queue.length} offline tickets...`);
      let successCount = 0;

      for (const item of queue) {
        const formData = new FormData();
        formData.append("vehicleId", item.vehicleId);
        formData.append("type", item.type);
        formData.append("description", item.description);
        formData.append("odoAtReport", item.odoAtReport.toString());

        if (item.imagesBase64 && item.imagesBase64.length > 0) {
          for (let i = 0; i < item.imagesBase64.length; i++) {
            const base64 = item.imagesBase64[i];
            const res = await fetch(base64);
            const blob = await res.blob();
            formData.append("images", blob, `ticket_img_${i}.jpg`);
          }
        }

        if (item.voiceBase64) {
          const res = await fetch(item.voiceBase64);
          const blob = await res.blob();
          formData.append("voiceNote", blob, "voice_explanation.webm");
        }

        await apiRequest("/tickets", {
          method: "POST",
          body: formData,
        });
        successCount++;
      }

      localStorage.removeItem("offline_tickets");
      setPendingSync(0);
      setSuccess(`Successfully synchronized ${successCount} offline tickets with server!`);
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      console.error("[PWA Sync] Offline tickets sync failed:", err);
      setError("Failed to sync offline tickets. Will retry later.");
    }
  }, []);

  const loadVehicleDetails = useCallback(async () => {
    const cachedProfile = localStorage.getItem("driver_profile");
    const cachedVehicle = localStorage.getItem("assigned_vehicle");

    if (!cachedProfile) {
      router.push("/login");
      return;
    }

    if (cachedVehicle) {
      const parsedVehicle = JSON.parse(cachedVehicle) as AssignedVehicle;
      setVehicle(parsedVehicle);
      setOdoAtReport(parsedVehicle.currentOdometer?.toString() || "");

      // Try to load fresh odometer
      try {
        const data = await apiRequest(`/vehicles/${parsedVehicle.id}`);
        if (data.vehicle) {
          setOdoAtReport(data.vehicle.currentOdometer?.toString() || "");
        }
      } catch (err) {
        console.warn("Failed to load fresh odometer, using cached value:", err);
      }
    }
  }, [router]);

  useEffect(() => {
    loadVehicleDetails();
  }, [loadVehicleDetails]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);

      const goOnline = () => {
        setIsOnline(true);
        syncOfflineTickets();
      };
      const goOffline = () => setIsOnline(false);

      window.addEventListener("online", goOnline);
      window.addEventListener("offline", goOffline);

      const queueStr = localStorage.getItem("offline_tickets");
      if (queueStr) {
        setPendingSync(JSON.parse(queueStr).length);
      }

      return () => {
        window.removeEventListener("online", goOnline);
        window.removeEventListener("offline", goOffline);
      };
    }
  }, [syncOfflineTickets]);

  // Voice note recorder handlers
  const startRecording = async () => {
    setError("");
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Audio recording failed:", err);
      setError("Microphone permission denied or device unsupported.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      // Stop all tracks to release microphone
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
    }
  };

  const toggleAudioPlayback = () => {
    if (!audioUrl) return;

    if (!audioPlayerRef.current) {
      const player = new Audio(audioUrl);
      player.onended = () => setIsAudioPlaying(false);
      player.play();
      audioPlayerRef.current = player;
      setIsAudioPlaying(true);
    } else {
      if (isAudioPlaying) {
        audioPlayerRef.current.pause();
        setIsAudioPlaying(false);
      } else {
        audioPlayerRef.current.play();
        setIsAudioPlaying(true);
      }
    }
  };

  const clearVoiceRecording = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setIsAudioPlaying(false);
  };

  // Image upload handles
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileList = Array.from(e.target.files);
      const totalImages = images.length + fileList.length;

      if (totalImages > 3) {
        alert("Maximum of 3 images can be attached to a ticket.");
        return;
      }

      // MIME and Size check
      const validFiles: File[] = [];
      const newPreviews: string[] = [];

      for (const file of fileList) {
        if (file.size > 10 * 1024 * 1024) {
          alert(`File ${file.name} exceeds 10MB limit.`);
          continue;
        }

        const allowedTypes = ["image/jpeg", "image/png"];
        if (!allowedTypes.includes(file.type)) {
          alert(`Format for ${file.name} is invalid. Choose JPEG or PNG.`);
          continue;
        }

        validFiles.push(file);
        newPreviews.push(URL.createObjectURL(file));
      }

      setImages((prev) => [...prev, ...validFiles]);
      setImagePreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle) {
      setError("No vehicle assigned to profile.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    const formData = new FormData();
    formData.append("vehicleId", vehicle.id);
    formData.append("type", ticketType);
    formData.append("description", description);
    formData.append("odoAtReport", odoAtReport);

    // Append attachments
    images.forEach((img) => {
      formData.append("images", img);
    });

    if (audioBlob) {
      formData.append("voiceNote", audioBlob, "voice_explanation.webm");
    }

    if (!isOnline) {
      try {
        const imagesBase64: string[] = [];
        for (const file of images) {
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          imagesBase64.push(base64);
        }

        let voiceBase64 = null;
        if (audioBlob) {
          voiceBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(audioBlob);
          });
        }

        const offlineLog = {
          vehicleId: vehicle.id,
          type: ticketType,
          description,
          odoAtReport,
          imagesBase64,
          voiceBase64,
          timestamp: new Date().toISOString(),
        };

        const existingQueue = JSON.parse(localStorage.getItem("offline_tickets") || "[]");
        existingQueue.push(offlineLog);
        localStorage.setItem("offline_tickets", JSON.stringify(existingQueue));
        setPendingSync(existingQueue.length);

        setSuccess("Ticket saved offline! It will automatically sync when connection returns.");
        setDescription("");
        setImages([]);
        setImagePreviews([]);
        clearVoiceRecording();
      } catch {
        setError("Failed to cache ticket offline.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    try {
      await apiRequest("/tickets", {
        method: "POST",
        body: formData,
      });

      setSuccess("Ticket reported successfully. Odometer details synced.");
      setDescription("");
      setImages([]);
      setImagePreviews([]);
      clearVoiceRecording();
      
      // Update vehicle local cache
      const cached = JSON.parse(localStorage.getItem("assigned_vehicle") || "{}");
      cached.currentOdometer = Number(odoAtReport);
      localStorage.setItem("assigned_vehicle", JSON.stringify(cached));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Failed to register ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased p-4">
      <div className="max-w-md mx-auto space-y-4 pb-12">
        
        {/* Header toolbar */}
        <div className="flex items-center justify-between border-b border-slate-900 pb-3">
          <button 
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Home
          </button>
          
          <div className="text-right">
            <h2 className="text-sm font-bold text-white">Report Issue</h2>
            {vehicle && <p className="text-[10px] text-slate-400 font-semibold">Vehicle: {vehicle.regNumber}</p>}
          </div>
        </div>

        {/* Offline sync pending banner */}
        {pendingSync > 0 && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{pendingSync} ticket{pendingSync > 1 ? "s" : ""} queued offline</span>
            </div>
            <button
              type="button"
              onClick={syncOfflineTickets}
              className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold transition-colors"
            >
              Sync Now
            </button>
          </div>
        )}

        {/* Status Notices */}
        {success && (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold animate-in fade-in duration-200">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold animate-in fade-in duration-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Category selection selector */}
          <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Category of Issue</label>
            <select
              value={ticketType}
              onChange={(e) => setTicketType(e.target.value as TicketType)}
              className="h-11 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-200 outline-none focus:border-violet-500"
            >
              <option value={TicketType.ENGINE}>Engine Issues</option>
              <option value={TicketType.BRAKE}>Brake / Retarder</option>
              <option value={TicketType.TYRE}>Tire / Wheel alignment</option>
              <option value={TicketType.ELECTRICAL}>Electricals / Lights</option>
              <option value={TicketType.AC}>Cabin AC / Heater</option>
              <option value={TicketType.BODY}>Cabin Body details</option>
              <option value={TicketType.PREVENTIVE}>Scheduled Preventive</option>
              <option value={TicketType.OTHER}>Other / General</option>
            </select>
          </div>

          {/* Issue Description */}
          <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Odometer reading (km)</label>
            <input
              type="number"
              required
              inputMode="numeric"
              value={odoAtReport}
              onChange={(e) => setOdoAtReport(e.target.value)}
              className="h-11 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm font-bold text-slate-200 text-center"
              placeholder="12000"
            />

            <div className="h-px bg-slate-850 my-1"></div>

            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide block">Describe the Issue</label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please describe what is wrong with the vehicle in detail..."
              className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-slate-200 outline-none focus:border-violet-500 resize-none"
            />
          </div>

          {/* Voice Memo recording widget */}
          <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide block">Record Voice Explanation</label>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/40 border border-slate-850">
              <div className="flex items-center gap-2">
                {isRecording ? (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="h-9 w-9 rounded-full bg-rose-600 flex items-center justify-center text-white animate-pulse"
                  >
                    <Square className="h-4.5 w-4.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="h-9 w-9 rounded-full bg-violet-600/10 border border-violet-500/30 flex items-center justify-center text-violet-400 hover:bg-violet-600 hover:text-white"
                  >
                    <Mic className="h-4.5 w-4.5" />
                  </button>
                )}

                <div>
                  <span className="text-xs font-semibold text-slate-200">
                    {isRecording ? "Recording..." : audioUrl ? "Voice note captured" : "Capture microphone"}
                  </span>
                  <p className="text-[10px] text-slate-500">Tap icon to record/stop</p>
                </div>
              </div>

              {audioUrl && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleAudioPlayback}
                    className="p-2 rounded bg-slate-900 hover:bg-slate-850 text-slate-350"
                  >
                    {isAudioPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={clearVoiceRecording}
                    className="p-2 rounded bg-rose-950/10 text-rose-450 hover:bg-rose-950/30"
                  >
                    <Trash className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Image attachments camera upload */}
          <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide block">Attach Photos (max 3)</label>
            
            <div className="relative border-2 border-dashed border-slate-800 hover:border-slate-700 transition-colors rounded-xl p-6 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-slate-950/40">
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png"
                capture="environment"
                onChange={handleImageChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Camera className="h-6 w-6 text-slate-500" />
              <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider">Tap to Capture photo</span>
            </div>

            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-2 pt-2">
                {imagePreviews.map((src, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-slate-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="Preview" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-slate-950/80 text-rose-400 hover:bg-slate-950"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-500 font-bold text-sm text-white disabled:opacity-50 transition-colors shadow-lg shadow-violet-600/10 flex items-center justify-center gap-1.5"
          >
            {submitting ? "Submitting issue report..." : "Report Vehicle Issue"}
          </button>

        </form>

      </div>
    </div>
  );
}
