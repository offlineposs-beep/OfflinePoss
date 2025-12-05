"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { RepairJob, RepairStatus } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ArrowUpDown, MoreHorizontal, Edit, Trash2, DollarSign, Printer } from "lucide-react"
import { Badge } from "../ui/badge"
import { RepairFormDialog } from "./repair-form-dialog"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { useCurrency } from "@/hooks/use-currency"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { useFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { doc } from "firebase/firestore"
import { RepairTicket } from "./repair-ticket"
import { useCallback } from "react"
import { renderToString } from "react-dom/server"
import { PayRepairButton } from "./pay-repair-button"

const statusColors: Record<RepairStatus, "default" | "secondary" | "destructive" | "outline"> = {
    'Pendiente': 'destructive',
    'Diagnóstico': 'outline',
    'En Progreso': 'default',
    'Esperando Piezas': 'destructive',
    'Listo para Recoger': 'default',
    'Completado': 'secondary',
};

const repairStatuses: RepairStatus[] = ['Pendiente', 'Diagnóstico', 'En Progreso', 'Esperando Piezas', 'Listo para Recoger', 'Completado'];


const ActionsCell = ({ repairJob }: { repairJob: RepairJob }) => {
    const { toast } = useToast();
    const { firestore } = useFirebase();

    const handleDelete = () => {
        if (!firestore || !repairJob.id) return;
        const jobRef = doc(firestore, 'repair_jobs', repairJob.id);
        deleteDocumentNonBlocking(jobRef);
        toast({
            title: "Trabajo de Reparación Eliminado",
            description: `El trabajo para ${repairJob.customerName} ha sido eliminado.`,
            variant: "destructive"
        })
    }

    const handlePrintTicket = useCallback(() => {
        const ticketHtml = renderToString(<RepairTicket repairJob={repairJob} />);
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
    }, [repairJob, toast]);

    return (
        <AlertDialog>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Abrir menú</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={handlePrintTicket}>
                        <Printer className="mr-2 h-4 w-4" />
                        Imprimir Ticket
                    </DropdownMenuItem>
                    <RepairFormDialog repairJob={repairJob}>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar / Ver Detalles
                        </DropdownMenuItem>
                    </RepairFormDialog>
                    <DropdownMenuSeparator />
                    <AlertDialogTrigger asChild>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(e) => e.preventDefault()}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                        </DropdownMenuItem>
                    </AlertDialogTrigger>
                </DropdownMenuContent>
            </DropdownMenu>
             <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esto eliminará permanentemente el trabajo de reparación para <span className="font-semibold">{repairJob.customerName}</span>.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

const StatusCell = ({ repairJob }: { repairJob: RepairJob }) => {
    const { toast } = useToast();
    const { firestore } = useFirebase();

    const handleStatusChange = (newStatus: RepairStatus) => {
        if (!firestore || !repairJob.id) return;
        const jobRef = doc(firestore, 'repair_jobs', repairJob.id);
        updateDocumentNonBlocking(jobRef, { status: newStatus });
        toast({
            title: 'Estado Actualizado',
            description: `El estado de la reparación de ${repairJob.customerName} es ahora "${newStatus}".`
        })
    }

    const status: RepairStatus = repairJob.status;
    const isPaid = repairJob.isPaid;
    const variant = statusColors[status] || 'secondary';
    
    let badgeClassName = '';
    if (status === 'Listo para Recoger' && !isPaid) {
        badgeClassName = 'bg-yellow-500 text-black hover:bg-yellow-600';
    } else if (status === 'Completado' && isPaid) {
         badgeClassName = 'bg-green-500 text-white hover:bg-green-600';
    }

    return (
        <Select value={repairJob.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-48 border-0 bg-transparent shadow-none focus:ring-0">
                <SelectValue asChild>
                     <Badge variant={variant} className={badgeClassName}>{repairJob.status}</Badge>
                </SelectValue>
            </SelectTrigger>
            <SelectContent>
                {repairStatuses.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}

export const columns: ColumnDef<RepairJob>[] = [
  {
    accessorKey: "id",
    header: "ID de Trabajo",
    cell: ({ row }) => <div className="text-xs text-muted-foreground">{row.original.id}</div>,
  },
  {
    accessorKey: "customerName",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Cliente
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="font-medium">{row.getValue("customerName")}</div>
  },
  {
    accessorKey: "device",
    header: "Dispositivo",
    cell: ({ row }) => `${row.original.deviceMake} ${row.original.deviceModel}`,
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => <StatusCell repairJob={row.original} />,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Fecha de Registro
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
        const date = parseISO(row.getValue("createdAt"));
        return <div>{format(date, 'MMM d, yyyy', { locale: es })}</div>
    }
  },
  {
    accessorKey: "estimatedCost",
    header: () => <div className="text-right">Costo Total</div>,
    cell: function Cell({ row }) {
      const { format, getSymbol } = useCurrency();
      const amount = parseFloat(row.getValue("estimatedCost"))
      return <div className="text-right font-medium">{getSymbol()}{format(amount)}</div>
    },
  },
   {
    accessorKey: "amountPaid",
    header: () => <div className="text-right">Pagado</div>,
    cell: function Cell({ row }) {
      const { format, getSymbol } = useCurrency();
      const amount = parseFloat(row.getValue("amountPaid") || 0)
      return <div className="text-right font-medium text-green-600">{getSymbol()}{format(amount)}</div>
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionsCell repairJob={row.original} />,
  },
  {
    id: 'cobrar',
    cell: ({ row }) => {
        const repairJob = row.original;
        const remainingBalance = repairJob.estimatedCost - (repairJob.amountPaid || 0);
        
        if ((repairJob.status === 'Listo para Recoger' || repairJob.status === 'Completado') && remainingBalance > 0) {
            return <PayRepairButton repairJob={repairJob} />;
        }
        return null;
    }
   },
]
