import React, { useMemo, useRef, useState } from "react";
import { Download, Share2, Zap } from "lucide-react";
import { toBlob } from "html-to-image";
import { Modal } from "./PaymentModal.jsx";
import { allocateLedger } from "../lib/balance.js";
import { fmtAmount, fmtDateTime, fmtMonth } from "./format.js";

const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

// Genera una imagen del recibo (siempre en modo claro, sea cual sea el tema
// de la app) y la comparte vía el share sheet del sistema (WhatsApp incluido
// si está instalado) o la descarga si el navegador no puede compartir
// archivos.
export default function ReciboModal({ client, payment, config, onClose }) {
  const cardRef = useRef(null);
  const [working, setWorking] = useState(false);
  const [status, setStatus] = useState(null);

  const receipt = config.receipt ?? {};
  const businessName = receipt.businessName || "Yupana";

  // Qué meses cubrió específicamente este pago (no el total del cliente):
  // el monto completo de cada mes (no solo lo que aportó este pago, para que
  // "PAGADO" refleje el mes entero aunque otro pago ya lo haya adelantado en
  // parte) + si con este pago ese mes quedó del todo cubierto o no.
  const monthLines = useMemo(() => {
    const { charges, payments: ledgerPayments } = allocateLedger(client, client.payments ?? []);
    const covered = ledgerPayments.find((p) => p.id === payment.id)?.monthsCovered ?? [];
    return covered.map(({ date, amount: aporte }) => {
      const charge = charges.find((c) => c.date.getTime() === date.getTime());
      return { date, aporte, amount: charge?.amount ?? aporte, paid: charge?.status === "paid" };
    });
  }, [client, payment]);

  // Suma lo que este pago (no el mes completo) aportó — así coincide con el
  // monto realmente pagado, salvo que parte se haya usado para saldar un
  // ajuste de saldo previo, que no corresponde a ningún mes puntual.
  const monthsTotal = monthLines.reduce((sum, m) => sum + m.aporte, 0);

  const buildBlob = () =>
    toBlob(cardRef.current, { pixelRatio: 2, backgroundColor: "#ffffff" });

  const share = async () => {
    setWorking(true);
    setStatus(null);
    try {
      const blob = await buildBlob();
      const file = new File([blob], `recibo-${client.name}.png`, { type: "image/png" });
      if (canNativeShare && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Recibo de pago" });
        setStatus("Recibo compartido.");
        return;
      }
      downloadBlob(blob, file.name);
      setStatus("Se descargó la imagen. Podés adjuntarla en WhatsApp manualmente.");
    } catch (err) {
      if (err?.name !== "AbortError") setStatus("No se pudo generar el recibo.");
    } finally {
      setWorking(false);
    }
  };

  const download = async () => {
    setWorking(true);
    setStatus(null);
    try {
      const blob = await buildBlob();
      downloadBlob(blob, `recibo-${client.name}.png`);
      setStatus("Recibo descargado.");
    } catch {
      setStatus("No se pudo generar el recibo.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <Modal onClose={onClose} titulo="Recibo">
      <div ref={cardRef} className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-3">
          {receipt.logoDataUrl ? (
            <img
              src={receipt.logoDataUrl}
              alt={businessName}
              className="h-10 w-10 rounded-lg object-contain"
            />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-600 text-white">
              <Zap size={20} />
            </span>
          )}
          <div>
            <p className="font-bold text-slate-900">{businessName}</p>
            {receipt.tagline && <p className="text-xs text-slate-500">{receipt.tagline}</p>}
          </div>
        </div>

        <div className="my-3 border-t border-slate-200" />

        <p className="text-xs uppercase tracking-wide text-slate-400">Recibo de pago</p>
        <p className="mt-1 text-sm text-slate-700">
          {client.name}
          {client.code && ` · ${client.code}`}
        </p>
        <p className="mt-2 text-2xl font-bold text-teal-700">{fmtAmount(payment.amount, config)}</p>
        <p className="mt-1 text-sm text-slate-500">{fmtDateTime(payment.date, config)}</p>
        <p className="text-sm text-slate-500">{payment.method}</p>
        {payment.note && <p className="mt-1 text-sm italic text-slate-500">{payment.note}</p>}

        {monthLines.length > 0 && (
          <>
            <div className="my-3 border-t border-slate-200" />
            <p className="mb-1 text-xs uppercase tracking-wide text-slate-400">Detalle</p>
            <div className="space-y-1 text-sm text-slate-700">
              {monthLines.map((m) => (
                <div key={m.date.toISOString()} className="flex items-center justify-between">
                  <span>Mes {fmtMonth(m.date, config)}</span>
                  <span>
                    {fmtAmount(m.amount, config)} {m.paid ? "PAGADO" : "PARCIAL"}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-1 text-sm font-semibold text-slate-800">
              <span>Total</span>
              <span>{fmtAmount(monthsTotal, config)}</span>
            </div>
          </>
        )}

        <p className="mt-2 text-sm text-slate-600">
          Saldo pendiente:{" "}
          {client.balance > 0 ? fmtAmount(client.balance, config) : "Al día"}
        </p>

        <div className="my-3 border-t border-slate-200" />
        <p className="text-center text-xs text-slate-400">Recibo generado desde Yupana</p>
      </div>

      {status && <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">{status}</p>}

      <div className="mt-4 flex gap-2">
        {canNativeShare && (
          <button
            onClick={share}
            disabled={working}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            <Share2 size={16} /> Compartir
          </button>
        )}
        <button
          onClick={download}
          disabled={working}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <Download size={16} /> Descargar
        </button>
      </div>
    </Modal>
  );
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
