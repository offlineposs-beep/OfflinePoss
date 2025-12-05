"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { RepairJob, RepairStatus } from "@/lib/types";
import { useState, type ReactNode, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useCurrency } from "@/hooks/use-currency";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { useFirebase, setDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { renderToString } from "react-dom/server";
import { RepairTicket } from "./repair-ticket";
import { Printer } from "lucide-react";


const repairStatuses: RepairStatus[] = ['Pendiente', 'Diagnóstico', 'En Progreso', 'Esperando Piezas', 'Listo para Recoger', 'Completado'];

const formSchema = z.object({
  customerName: z.string().min(2, "El nombre es obligatorio."),
  customerPhone: z.string().min(10, "Se requiere un número de teléfono válido."),
  deviceMake: z.string().min(2, "La marca del dispositivo es obligatoria."),
  deviceModel: z.string().min(1, "El modelo del dispositivo es obligatorio."),
  deviceImei: z.string().optional(),
  reportedIssue: z.string().min(5, "La descripción del problema es obligatoria."),
  estimatedCost: z.coerce.number().min(0),
  amountPaid: z.coerce.number().min(0),
  isPaid: z.boolean(),
  status: z.enum(repairStatuses),
  notes: z.string().optional(),
});

type RepairFormData = z.infer<typeof formSchema>;

type RepairFormDialogProps = {
  repairJob?: RepairJob;
  children: ReactNode;
};

export function RepairFormDialog({ repairJob, children }: RepairFormDialogProps) {
  const { firestore } = useFirebase();
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { getSymbol } = useCurrency();

  const form = useForm<RepairFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      deviceMake: "",
      deviceModel: "",
      deviceImei: "",
      reportedIssue: "",
      estimatedCost: 0,
      amountPaid: 0,
      isPaid: false,
      status: "Pendiente",
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
        if (repairJob) {
            form.reset({
                ...repairJob,
                deviceImei: repairJob.deviceImei ?? "",
                notes: repairJob.notes ?? "",
                amountPaid: repairJob.amountPaid || 0,
            });
        } else {
            form.reset({
                customerName: "",
                customerPhone: "",
                deviceMake: "",
                deviceModel: "",
                deviceImei: "",
                reportedIssue: "",
                estimatedCost: 0,
                amountPaid: 0,
                isPaid: false,
                status: "Pendiente",
                notes: "",
            });
        }
    }
  }, [repairJob, form, open]);

  const handlePrintTicket = useCallback((job: RepairJob) => {
    const ticketHtml = renderToString(<RepairTicket repairJob={job} />);
    const printWindow = window.open('', '_blank', 'width=300,height=500');

    if (printWindow) {
        printWindow.document.write(`
            <html>
                <head>
                    <title>Ticket de Reparación</title>
                    <style>
                        body { margin: 0; font-family: monospace; font-size: 10px; }
                        .ticket-container { width: 58mm; padding: 2mm; box-sizing: border-box; }
                         .text-black { color: #000; } .bg-white { background-color: #fff; } .p-2 { padding: 0.5rem; }
                        .font-mono { font-family: monospace; } .text-xs { font-size: 0.75rem; line-height: 1rem; }
                        .max-w-\\[215px\\] { max-width: 215px; } .mx-auto { margin-left: auto; margin-right: auto; }
                        .text-center { text-align: center; } .mb-2 { margin-bottom: 0.5rem; } .my-2 { margin-top: 0.5rem; margin-bottom: 0.5rem; }
                        .font-bold { font-weight: 700; } .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
                        .my-1 { margin-top: 0.25rem; margin-bottom: 0.25rem; } .border-dashed { border-style: dashed; } .border-t { border-top-width: 1px; }
                        .border-black { border-color: #000; } .flex { display: flex; } .flex-1 { flex: 1 1 0%; }
                        .w-1\\/4 { width: 25%; } .text-right { text-align: right; }
                        .space-y-1 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.25rem; }
                        .break-words { overflow-wrap: break-word; } .justify-between { justify-content: space-between; }
                        .text-destructive { color: hsl(var(--destructive)); } .font-bold { font-weight: 700; }
                        .mt-2 { margin-top: 0.5rem; } .mb-1 { margin-bottom: 0.25rem; }
                        .font-semibold { font-weight: 600; }
                    </style>
                </head>
                <body>
                    <div class="ticket-container">${ticketHtml}</div>
                    <script>
                        window.onload = function() { window.print(); window.close(); }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    } else {
         toast({
            variant: "destructive",
            title: "Error de Impresión",
            description: "No se pudo abrir la ventana de impresión. Revisa si tu navegador está bloqueando las ventanas emergentes."
        })
    }
  }, [toast]);


  async function onSubmit(values: RepairFormData) {
    if (!firestore) return;

    const finalValues = {
        ...values,
        deviceImei: values.deviceImei || "",
        notes: values.notes || "",
    };

    if (repairJob) {
      const jobRef = doc(firestore, 'repair_jobs', repairJob.id);
      setDocumentNonBlocking(jobRef, finalValues, { merge: true });
      toast({ title: "Trabajo de Reparación Actualizado", description: `El trabajo para ${values.customerName} ha sido actualizado.` });
    } else {
      const jobsCollection = collection(firestore, 'repair_jobs');
      const newJob = { 
        createdAt: new Date().toISOString(), 
        ...finalValues 
      };
      const newDocRef = await addDocumentNonBlocking(jobsCollection, newJob);
      if (newDocRef) {
        const fullJobData: RepairJob = { ...newJob, id: newDocRef.id };
        handlePrintTicket(fullJobData);
      }
      toast({ title: "Trabajo de Reparación Creado", description: `Nuevo trabajo para ${values.customerName} ha sido registrado.` });
    }
    setOpen(false);
    form.reset();
  }

  const estimatedCost = form.watch('estimatedCost');
  const amountPaid = form.watch('amountPaid');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{repairJob ? 'Editar Trabajo de Reparación' : 'Registrar Nuevo Trabajo de Reparación'}</DialogTitle>
          <DialogDescription>
            {repairJob ? 'Actualiza los detalles de este trabajo de reparación.' : 'Rellena los detalles para el nuevo trabajo de reparación.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-6">
            <fieldset className="grid grid-cols-2 gap-4">
              <legend className="text-sm font-medium mb-2 col-span-2">Información del Cliente</legend>
                <FormField control={form.control} name="customerName" render={({ field }) => (
                    <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="customerPhone" render={({ field }) => (
                    <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input placeholder="555-123-4567" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
            </fieldset>

            <fieldset className="grid grid-cols-2 gap-4">
              <legend className="text-sm font-medium mb-2 col-span-2">Información del Dispositivo</legend>
                <FormField control={form.control} name="deviceMake" render={({ field }) => (
                    <FormItem><FormLabel>Marca</FormLabel><FormControl><Input placeholder="Apple" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="deviceModel" render={({ field }) => (
                    <FormItem><FormLabel>Modelo</FormLabel><FormControl><Input placeholder="iPhone 14 Pro" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                 <FormField control={form.control} name="deviceImei" render={({ field }) => (
                    <FormItem className="col-span-2"><FormLabel>IMEI / Serie (Opcional)</FormLabel><FormControl><Input placeholder="123456789012345" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
            </fieldset>
            
            <FormField control={form.control} name="reportedIssue" render={({ field }) => (
                <FormItem><FormLabel>Problema Reportado</FormLabel><FormControl><Textarea placeholder="Describe el problema..." {...field} /></FormControl><FormMessage /></FormItem>
            )}/>

             <fieldset className="grid grid-cols-2 gap-4">
                <legend className="text-sm font-medium mb-2 col-span-2">Costos y Estado</legend>
                 <FormField control={form.control} name="estimatedCost" render={({ field }) => (
                    <FormItem><FormLabel>Costo Total ({getSymbol()})</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="amountPaid" render={({ field }) => (
                    <FormItem><FormLabel>Monto Pagado ({getSymbol()})</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>

                <div className="col-span-2 text-sm font-medium p-2 bg-muted rounded-md">
                    Saldo Pendiente: {getSymbol()}{(estimatedCost - amountPaid).toFixed(2)}
                </div>

                <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem><FormLabel>Estado</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar estado" /></SelectTrigger></FormControl>
                            <SelectContent>{repairStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                    <FormMessage /></FormItem>
                )}/>
                 <FormField
                    control={form.control}
                    name="isPaid"
                    render={({ field }) => (
                        <FormItem className="flex items-end pb-2">
                        <div className="flex items-center space-x-2">
                            <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} id="isPaid"/>
                            </FormControl>
                            <Label htmlFor="isPaid" className="cursor-pointer">Marcar como Pagado</Label>
                        </div>
                        </FormItem>
                    )}
                />
            </fieldset>
             <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notas Internas</FormLabel><FormControl><Textarea placeholder="Añade cualquier nota interna..." {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <DialogFooter className="sticky bottom-0 bg-background pt-4 items-center">
                {repairJob && (
                    <Button type="button" variant="outline" onClick={() => handlePrintTicket(repairJob)}>
                        <Printer className="mr-2 h-4 w-4" />
                        Imprimir Ticket
                    </Button>
                )}
              <Button type="submit">{repairJob ? 'Guardar Cambios' : 'Registrar y Imprimir Ticket'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
