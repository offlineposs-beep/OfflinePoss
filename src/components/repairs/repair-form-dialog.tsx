
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
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
import type { RepairJob, RepairStatus, Product, ReservedPart } from "@/lib/types";
import { useState, type ReactNode, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useCurrency } from "@/hooks/use-currency";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { useFirebase, setDocumentNonBlocking, addDocumentNonBlocking, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, writeBatch, query, where, getDocs } from "firebase/firestore";
import { handlePrintTicket } from "./repair-ticket";
import { AlertCircle, Printer, Search, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../ui/command";
import { format, addDays } from "date-fns";
import { useDebounce } from "use-debounce";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { es } from "date-fns/locale";

const repairStatuses: RepairStatus[] = ['Pendiente', 'Diagnóstico', 'En Progreso', 'Esperando Piezas', 'Listo para Recoger', 'Completado'];

const reservedPartSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1."),
});

const formSchema = z.object({
  customerName: z.string().min(2, "El nombre es obligatorio."),
  customerPhone: z.string().min(10, "Se requiere un número de teléfono válido."),
  deviceMake: z.string().min(2, "La marca del dispositivo es obligatoria."),
  deviceModel: z.string().min(1, "El modelo del dispositivo es obligatorio."),
  deviceImei: z.string().optional(),
  reportedIssue: z.string().min(5, "La descripción del problema es obligatoria."),
  initialCondition: z.string().optional(), // Nuevo campo
  estimatedCost: z.coerce.number().min(0),
  amountPaid: z.coerce.number().min(0),
  isPaid: z.boolean(),
  status: z.enum(repairStatuses),
  notes: z.string().optional(),
  reservedParts: z.array(reservedPartSchema).optional(),
});

type RepairFormData = z.infer<typeof formSchema>;

type RepairFormDialogProps = {
  repairJob?: RepairJob;
  children: ReactNode;
};

function generateJobId() {
    const date = new Date();
    const datePart = format(date, "yyMMdd");
    const randomPart = Math.floor(1000 + Math.random() * 9000).toString();
    return `R-${datePart}-${randomPart}`;
}

export function RepairFormDialog({ repairJob, children }: RepairFormDialogProps) {
  const { firestore } = useFirebase();
  const [open, setOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const { toast } = useToast();
  const { getSymbol } = useCurrency();
  const [warrantyInfo, setWarrantyInfo] = useState<{ message: string; date: string } | null>(null);

  const productsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'products') : null, [firestore]);
  const { data: products } = useCollection<Product>(productsCollection);
  
  const repairsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'repair_jobs') : null, [firestore]);

  const form = useForm<RepairFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      deviceMake: "",
      deviceModel: "",
      deviceImei: "",
      reportedIssue: "",
      initialCondition: "",
      estimatedCost: 0,
      amountPaid: 0,
      isPaid: false,
      status: "Pendiente",
      notes: "",
      reservedParts: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "reservedParts",
  });
  
  const imeiValue = form.watch('deviceImei');
  const [debouncedImei] = useDebounce(imeiValue, 500); // 500ms debounce

  const checkWarranty = useCallback(async (imei: string) => {
    if (!imei || !repairsCollection || (repairJob && imei === repairJob.deviceImei)) {
        setWarrantyInfo(null);
        return;
    };

    const q = query(
        repairsCollection,
        where("deviceImei", "==", imei),
        where("status", "==", "Completado")
    );
    
    const querySnapshot = await getDocs(q);
    const now = new Date();
    let activeWarranty: { message: string, date: string } | null = null;

    querySnapshot.forEach((doc) => {
        const job = doc.data() as RepairJob;
        if (job.warrantyEndDate) {
            const warrantyEnd = new Date(job.warrantyEndDate);
            if (now < warrantyEnd) {
                activeWarranty = {
                    message: `Este dispositivo tiene una garantía activa de una reparación anterior (ID: ${job.id}).`,
                    date: `Válida hasta: ${format(warrantyEnd, 'PPP', { locale: es })}`
                };
            }
        }
    });

    setWarrantyInfo(activeWarranty);
  }, [repairsCollection, repairJob]);

  useEffect(() => {
    if (debouncedImei) {
        checkWarranty(debouncedImei);
    } else {
        setWarrantyInfo(null);
    }
  }, [debouncedImei, checkWarranty]);


  useEffect(() => {
    if (open) {
        setWarrantyInfo(null); // Reset warranty info when dialog opens
        if (repairJob) {
            form.reset({
                ...repairJob,
                deviceImei: repairJob.deviceImei ?? "",
                initialCondition: repairJob.initialCondition ?? "",
                notes: repairJob.notes ?? "",
                amountPaid: repairJob.amountPaid || 0,
                reservedParts: repairJob.reservedParts || [],
            });
        } else {
            form.reset({
                customerName: "",
                customerPhone: "",
                deviceMake: "",
                deviceModel: "",
                deviceImei: "",
                reportedIssue: "",
                initialCondition: "",
                estimatedCost: 0,
                amountPaid: 0,
                isPaid: false,
                status: "Pendiente",
                notes: "",
                reservedParts: [],
            });
        }
    }
  }, [repairJob, form, open]);

  const onPrint = (job: RepairJob) => {
    handlePrintTicket({ repairJob: job }, (error) => {
      toast({
        variant: "destructive",
        title: "Error de Impresión",
        description: error,
      });
    });
  };


  async function onSubmit(values: RepairFormData) {
    if (!firestore) return;

    const batch = writeBatch(firestore);
    const originalParts = repairJob?.reservedParts || [];
    const newParts = values.reservedParts || [];

    // Calculate changes in reservations
    const reservationChanges: { [productId: string]: number } = {};

    originalParts.forEach(part => {
        reservationChanges[part.productId] = (reservationChanges[part.productId] || 0) - part.quantity;
    });

    newParts.forEach(part => {
        reservationChanges[part.productId] = (reservationChanges[part.productId] || 0) + part.quantity;
    });

    for (const productId in reservationChanges) {
        const change = reservationChanges[productId];
        if (change !== 0) {
            const productRef = doc(firestore, 'products', productId);
            const product = products?.find(p => p.id === productId);
            if(product) {
                const newReservedStock = (product.reservedStock || 0) + change;
                batch.update(productRef, { reservedStock: newReservedStock });
            }
        }
    }

    const wasCompleted = repairJob?.status === 'Completado';
    const isNowCompleted = values.status === 'Completado';
    let completionData = {};
    if(isNowCompleted && !wasCompleted) {
        const completionDate = new Date();
        completionData = {
            completedAt: completionDate.toISOString(),
            warrantyEndDate: addDays(completionDate, 4).toISOString()
        }
    }

    const finalValues = { ...values, notes: values.notes || "", initialCondition: values.initialCondition || "" };

    if (repairJob) {
      const jobRef = doc(firestore, 'repair_jobs', repairJob.id!);
      batch.set(jobRef, { ...finalValues, ...completionData }, { merge: true });
      await batch.commit();
      toast({ title: "Trabajo de Reparación Actualizado", description: `El trabajo para ${values.customerName} ha sido actualizado.` });
    } else {
      const jobId = generateJobId();
      const newJobData = { ...finalValues, id: jobId, createdAt: new Date().toISOString(), ...completionData };
      const jobRef = doc(firestore, 'repair_jobs', jobId);
      batch.set(jobRef, newJobData);
      await batch.commit();
      
      const fullJobData: RepairJob = { ...newJobData, reservedParts: newJobData.reservedParts || [] };
      onPrint(fullJobData);
      
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{repairJob ? 'Editar / Ver Detalles de Reparación' : 'Registrar Nuevo Trabajo de Reparación'}</DialogTitle>
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
                {warrantyInfo && (
                    <Alert variant="destructive" className="col-span-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>¡Dispositivo en Garantía!</AlertTitle>
                        <AlertDescription>
                            {warrantyInfo.message}<br />
                            <span className="font-semibold">{warrantyInfo.date}</span>
                        </AlertDescription>
                    </Alert>
                )}
            </fieldset>
            
            <FormField control={form.control} name="reportedIssue" render={({ field }) => (
                <FormItem><FormLabel>Problema Reportado</FormLabel><FormControl><Textarea placeholder="Describe el problema..." {...field} /></FormControl><FormMessage /></FormItem>
            )}/>

             <FormField control={form.control} name="initialCondition" render={({ field }) => (
                <FormItem><FormLabel>Condición Inicial y Accesorios</FormLabel><FormControl><Textarea placeholder="Ej: Pantalla con rayones leves, se entrega con cargador..." {...field} /></FormControl><FormMessage /></FormItem>
            )}/>

             <fieldset>
                <legend className="text-sm font-medium mb-2 col-span-2">Piezas Reservadas</legend>
                <div className="space-y-2">
                    {fields.map((field, index) => {
                        return (
                            <div key={field.id} className="flex items-center gap-2 p-2 border rounded-md">
                                <span className="flex-1">{field.productName}</span>
                                <Input 
                                    type="number" 
                                    {...form.register(`reservedParts.${index}.quantity` as const)}
                                    className="w-20"
                                />
                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                            </div>
                        )
                    })}
                     <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button type="button" variant="outline" className="w-full">
                                <Search className="mr-2 h-4 w-4" /> Añadir Pieza
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0">
                            <Command>
                                <CommandInput placeholder="Buscar pieza..." />
                                <CommandList>
                                <CommandEmpty>No se encontraron piezas.</CommandEmpty>
                                <CommandGroup>
                                    {(products || []).map((product) => {
                                        const availableStock = product.stockLevel - (product.reservedStock || 0);
                                        return (
                                            <CommandItem
                                                key={product.id}
                                                value={product.name}
                                                onSelect={() => {
                                                    if (availableStock > 0 && !fields.some(f => f.productId === product.id)) {
                                                        append({ productId: product.id!, productName: product.name, quantity: 1 });
                                                    } else {
                                                        toast({ variant: 'destructive', title: 'Stock no disponible o ya añadido' })
                                                    }
                                                    setPopoverOpen(false);
                                                }}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                }}
                                                disabled={availableStock <= 0 || fields.some(f => f.productId === product.id)}
                                                className="flex justify-between"
                                            >
                                                <span>{product.name}</span>
                                                <span className="text-xs text-muted-foreground">Disp: {availableStock}</span>
                                            </CommandItem>
                                        )
                                    })}
                                </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
             </fieldset>

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
                    <Button type="button" variant="outline" onClick={() => onPrint(repairJob)}>
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

    