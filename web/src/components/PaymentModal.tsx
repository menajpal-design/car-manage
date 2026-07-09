"use client";

import React, { useState } from "react";
import { 
  X, 
  CreditCard, 
  CheckCircle, 
  AlertTriangle,
  Coins
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { PaymentMethod, IInvoice, ITicket } from "@fleetmaster/shared";

interface PaymentModalProps {
  invoice: IInvoice;
  ticket: ITicket;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PaymentModal({ invoice, ticket, onClose, onSuccess }: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [transactionId, setTransactionId] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentMethod) {
      setError("Please select a payment method.");
      return;
    }

    if (
      (paymentMethod === PaymentMethod.BKASH || paymentMethod === PaymentMethod.NAGAD) &&
      !transactionId.trim()
    ) {
      setError("Transaction ID is required for mobile banking.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const data = await apiRequest("/payments", {
        method: "POST",
        body: JSON.stringify({
          invoiceId: invoice.id,
          paymentMethod,
          transactionId: paymentMethod === PaymentMethod.CASH ? undefined : transactionId.trim(),
          notes,
        }),
      });

      setSuccessMsg(data.message || "Payment submitted successfully.");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Failed to process payment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-850 px-5 py-4">
          <div>
            <h3 className="font-bold text-white text-base">Pay Invoice</h3>
            <p className="text-2xs text-slate-500 font-semibold mt-0.5">Reference: {invoice.invoiceNumber} for ticket {ticket.ticketNumber}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmitPayment} className="p-5 space-y-4">
          
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-450 text-xs font-semibold">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 text-xs font-semibold">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Bill breakdown summary */}
          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Maintenance Subtotal</span>
              <span>${invoice.subTotal?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Gov Tax (5% flat)</span>
              <span>${invoice.taxAmount?.toFixed(2)}</span>
            </div>
            <div className="h-px bg-slate-850 my-1"></div>
            <div className="flex justify-between font-bold text-white text-sm">
              <span>Total Bill Due</span>
              <span className="text-violet-400">${invoice.totalAmount?.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment method selector */}
          <div className="space-y-2">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Choose Payment Method</label>
            <div className="grid grid-cols-3 gap-2.5">
              
              {/* Cash */}
              <button
                type="button"
                onClick={() => { setPaymentMethod(PaymentMethod.CASH); setError(""); }}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                  paymentMethod === PaymentMethod.CASH
                    ? "bg-violet-600/15 border-violet-500 text-white"
                    : "bg-slate-950/20 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <Coins className="h-5 w-5 text-amber-500" />
                <span className="text-2xs font-bold uppercase">Cash Money</span>
              </button>

              {/* bKash */}
              <button
                type="button"
                onClick={() => { setPaymentMethod(PaymentMethod.BKASH); setError(""); }}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                  paymentMethod === PaymentMethod.BKASH
                    ? "bg-violet-600/15 border-violet-500 text-white"
                    : "bg-slate-950/20 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <CreditCard className="h-5 w-5 text-pink-500" />
                <span className="text-2xs font-bold uppercase">bKash</span>
              </button>

              {/* Nagad */}
              <button
                type="button"
                onClick={() => { setPaymentMethod(PaymentMethod.NAGAD); setError(""); }}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                  paymentMethod === PaymentMethod.NAGAD
                    ? "bg-violet-600/15 border-violet-500 text-white"
                    : "bg-slate-950/20 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <CreditCard className="h-5 w-5 text-orange-500" />
                <span className="text-2xs font-bold uppercase">Nagad</span>
              </button>

            </div>
          </div>

          {/* Conditional inputs */}
          {paymentMethod === PaymentMethod.CASH && (
            <div className="p-3 bg-slate-950/30 border border-slate-850 rounded-xl text-center text-xs text-slate-400 leading-normal animate-in fade-in duration-200">
              Note: Paying in Cash will immediately complete this transaction, close the maintenance ticket, and sync the vehicle service odometer logs.
            </div>
          )}

          {(paymentMethod === PaymentMethod.BKASH || paymentMethod === PaymentMethod.NAGAD) && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              <div className="p-3.5 bg-violet-600/10 border border-violet-500/20 rounded-xl text-xs text-slate-300">
                <p className="font-bold text-violet-400 mb-1">Mobile Banking Instructions:</p>
                Please send money to our merchant account <strong>+880 1789 220192</strong>. Once sent, enter the Transaction ID below for verification.
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Transaction ID / Reference Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TR10928A304"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="h-10 w-full rounded-lg bg-slate-950 border border-slate-800 focus:border-violet-500 outline-none px-3 text-xs text-slate-200 font-bold uppercase"
                />
              </div>
            </div>
          )}

          {/* Notes field */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Payment Notes (Optional)</label>
            <textarea
              rows={2}
              placeholder="e.g. Handed over to mechanic, paid via personal wallet, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg bg-slate-950 border border-slate-800 focus:border-violet-500 outline-none p-3 text-xs text-slate-200 resize-none"
            />
          </div>

          {/* Action button */}
          <button
            type="submit"
            disabled={loading || !paymentMethod}
            className="w-full h-11 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
          >
            {loading ? "Processing transaction..." : "Confirm & Submit Payment"}
          </button>

        </form>

      </div>
    </div>
  );
}
