
import type { RepairJob } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

type RepairTicketProps = {
    repairJob: RepairJob;
}

export function RepairTicket({ repairJob }: RepairTicketProps) {
    return (
        <div className="text-black bg-white p-2 font-mono text-xs max-w-[215px] mx-auto">
            <div className="text-center mb-2">
                <h3 className="font-bold text-sm">Ticket de Reparación</h3>
                <p>TabletSP+ v1.0.2</p>
                <p>Fecha: {format(parseISO(repairJob.createdAt), "dd/MM/yy hh:mm a", { locale: es })}</p>
                <p className="font-bold text-sm">ID: {repairJob.id}</p>
            </div>
            
            <div className="my-2 border-t border-dashed border-black"></div>

            <div className="space-y-1">
                <p><span className="font-semibold">Cliente:</span> {repairJob.customerName}</p>
                <p><span className="font-semibold">Teléfono:</span> {repairJob.customerPhone}</p>
            </div>

            <div className="my-2 border-t border-dashed border-black"></div>

            <div className="space-y-1">
                <p><span className="font-semibold">Dispositivo:</span> {repairJob.deviceMake} {repairJob.deviceModel}</p>
                {repairJob.deviceImei && <p><span className="font-semibold">IMEI/Serie:</span> {repairJob.deviceImei}</p>}
                <div>
                    <p className="font-semibold">Falla Reportada:</p>
                    <p className="break-words">{repairJob.reportedIssue}</p>
                </div>
            </div>

            <div className="my-2 border-t border-dashed border-black"></div>

            <div className="text-center space-y-1">
                {repairJob.estimatedCost > 0 && <p className="font-bold">Costo Estimado: ${repairJob.estimatedCost.toFixed(2)}</p>}
                {repairJob.amountPaid > 0 && <p>Monto Pagado: ${repairJob.amountPaid.toFixed(2)}</p>}
            </div>

             <div className="my-2 border-t border-dashed border-black"></div>

            <div className="text-center mt-2 text-xs">
                <p className="font-bold">Términos y Condiciones:</p>
                <p>No nos hacemos responsables por equipos abandonados después de 30 días.</p>
                <p>La garantía del servicio es de 15 días.</p>
                <p>Conserve este ticket para retirar su equipo.</p>
            </div>
        </div>
    )
}
