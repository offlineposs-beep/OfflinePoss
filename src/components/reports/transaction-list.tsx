"use client"

import type { Sale, Payment } from "@/lib/types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useCurrency } from "@/hooks/use-currency";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { ReceiptView } from "../pos/receipt-view";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Printer } from "lucide-react";
import React, { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { renderToString } from 'react-dom/server';
import { Skeleton } from "../ui/skeleton";

type TransactionListProps = {
    sales: Sale[];
    isLoading?: boolean;
};

const SaleReceiptDialog = ({ sale }: { sale: Sale }) => {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const { format: formatCurrency, getSymbol } = useCurrency();

    const getPaymentAmountInCorrectCurrency = useCallback((payment: Payment) => {
        const symbol = payment.method === 'Efectivo USD' ? '$' : 'Bs';
        return `${symbol}${formatCurrency(payment.amount)}`;
    }, [formatCurrency]);

    const handlePrintReceipt = useCallback(() => {
        const receiptProps = {
            sale,
            currencySymbol: getSymbol(),
            formatCurrency: formatCurrency,
            getPaymentAmountInCorrectCurrency: getPaymentAmountInCorrectCurrency
        };
        const receiptHtml = renderToString(<ReceiptView {...receiptProps} />);
        const printWindow = window.open('', '_blank', 'width=300,height=500');

        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Recibo</title>
                        <style>
                           body { 
                                margin: 0; 
                                font-family: monospace;
                                font-size: 10px;
                            }
                            .receipt-container { 
                                width: 58mm;
                                padding: 2mm;
                                box-sizing: border-box;
                            }
                            .text-black { color: #000; }
                            .bg-white { background-color: #fff; }
                            .p-2 { padding: 0.5rem; }
                            .font-mono { font-family: monospace; }
                            .text-xs { font-size: 0.75rem; line-height: 1rem; }
                            .max-w-\\[215px\\] { max-width: 215px; }
                            .mx-auto { margin-left: auto; margin-right: auto; }
                            .text-center { text-align: center; }
                            .mb-2 { margin-bottom: 0.5rem; }
                            .font-semibold { font-weight: 600; }
                            .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
                            .my-1 { margin-top: 0.25rem; margin-bottom: 0.25rem; }
                            .border-dashed { border-style: dashed; }
                            .border-black { border-color: #000; }
                            .flex { display: flex; }
                            .flex-1 { flex: 1 1 0%; }
                            .w-1\\/4 { width: 25%; }
                            .text-right { text-align: right; }
                            .space-y-1 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.25rem; }
                            .break-words { overflow-wrap: break-word; }
                            .justify-between { justify-content: space-between; }
                            .text-destructive { color: hsl(var(--destructive)); }
                            .font-bold { font-weight: 700; }
                            .mt-2 { margin-top: 0.5rem; }
                            .mb-1 { margin-bottom: 0.25rem; }
                        </style>
                    </head>
                    <body>
                        <div class="receipt-container">
                          ${receiptHtml}
                        </div>
                        <script>
                            window.onload = function() {
                                window.print();
                                window.close();
                            }
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
            });
        }
    }, [sale, toast, getSymbol, formatCurrency, getPaymentAmountInCorrectCurrency]);

    return (
        <div>
            <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
                <Printer className="w-4 h-4" />
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md p-0">
                    <DialogHeader className="p-4 pb-0">
                        <DialogTitle>Recibo de Venta</DialogTitle>
                    </DialogHeader>
                    <div className="overflow-y-auto p-4">
                        <ReceiptView 
                            sale={sale} 
                            currencySymbol={getSymbol()}
                            formatCurrency={formatCurrency}
                            getPaymentAmountInCorrectCurrency={getPaymentAmountInCorrectCurrency}
                        />
                    </div>
                    <div className="p-4 flex gap-2 border-t">
                        <Button onClick={handlePrintReceipt} variant="outline" className="w-full">
                            <Printer className="mr-2 h-4 w-4" />
                            Imprimir Recibo
                        </Button>
                        <Button onClick={() => setOpen(false)} className="w-full">
                            Cerrar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export function TransactionList({ sales, isLoading }: TransactionListProps) {
    const { format: formatCurrency, getSymbol } = useCurrency();

    if (isLoading) {
        return (
            <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                     <Skeleton key={i} className="h-16 w-full" />
                ))}
            </div>
        )
    }

    if (sales.length === 0) {
        return <p className="text-muted-foreground text-center">No hay transacciones todavía.</p>
    }

    const getPaymentAmountInCorrectCurrency = (payment: Payment) => {
        let symbol = payment.method === 'Efectivo USD' ? '$' : 'Bs';
        let amount = payment.amount;

        return `${symbol}${formatCurrency(amount)}`;
    }

    return (
        <Accordion type="single" collapsible className="w-full">
            {sales.map((sale) => (
                <AccordionItem value={sale.id!} key={sale.id}>
                    <AccordionTrigger>
                        <div className="flex justify-between w-full pr-4">
                            <div className="text-left">
                                <p className="font-semibold">{format(parseISO(sale.transactionDate), "PPP", { locale: es })}</p>
                                <p className="text-xs text-muted-foreground">{sale.id}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <p className="font-semibold text-lg">{getSymbol()}{formatCurrency(sale.totalAmount)}</p>
                            </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="flex justify-end mb-2">
                           <SaleReceiptDialog sale={sale} />
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Producto</TableHead>
                                    <TableHead className="text-center">Cantidad</TableHead>
                                    <TableHead className="text-right">Precio Unit.</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sale.items.map(item => (
                                    <TableRow key={item.productId}>
                                        <TableCell>{item.name}</TableCell>
                                        <TableCell className="text-center">{item.quantity}</TableCell>
                                        <TableCell className="text-right">{getSymbol()}{formatCurrency(item.price)}</TableCell>
                                        <TableCell className="text-right">{getSymbol()}{formatCurrency(item.price * item.quantity)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                         <div className="mt-4 space-y-2 text-sm text-right">
                             <p>Sub-total: {getSymbol()}{formatCurrency(sale.subtotal)}</p>
                             {sale.discount > 0 && <p className="text-destructive">Descuento: -{getSymbol()}{formatCurrency(sale.discount)}</p>}
                             <p className="font-bold text-base">Total: {getSymbol()}{formatCurrency(sale.totalAmount)}</p>
                        </div>
                         {sale.payments && sale.payments.length > 0 && (
                            <div className="mt-2 space-y-1 text-xs text-right text-muted-foreground">
                                <p className="font-semibold">Pagos:</p>
                                {sale.payments.map((p, i) => <p key={i}>{p.method}: {getPaymentAmountInCorrectCurrency(p)}</p>)}
                            </div>
                        )}
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    )
}
