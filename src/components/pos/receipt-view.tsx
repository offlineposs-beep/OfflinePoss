"use client";

import type { Sale, Payment } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Separator } from "../ui/separator";

type ReceiptViewProps = {
    sale: Sale;
    currencySymbol: string;
    formatCurrency: (value: number) => string;
    getPaymentAmountInCorrectCurrency: (payment: Payment) => string;
}

export function ReceiptView({ sale, currencySymbol, formatCurrency, getPaymentAmountInCorrectCurrency }: ReceiptViewProps) {
    return (
         <div className="text-black bg-white p-2 font-mono text-xs max-w-[215px] mx-auto">
            <div className="text-center mb-2">
                <h3 className="font-semibold text-sm">Recibo de Venta</h3>
                <p>TabletSP+ v1.0.2</p>
                <p>{format(parseISO(sale.transactionDate), "dd/MM/yy hh:mm a", { locale: es })}</p>
                <p>ID: {sale.id}</p>
            </div>
            <Separator className="my-1 border-dashed border-black" />
            <div className="flex font-semibold">
                <div className="flex-1">Producto</div>
                <div className="w-1/4 text-right">Total</div>
            </div>
            <Separator className="my-1 border-dashed border-black" />
            <div className="space-y-1">
                {sale.items.map(item => (
                    <div key={item.productId}>
                        <div className="break-words">{item.name}</div>
                        <div className="flex justify-between">
                            <span>{item.quantity} x {currencySymbol}{formatCurrency(item.price)}</span>
                            <span>{currencySymbol}{formatCurrency(item.price * item.quantity)}</span>
                        </div>
                    </div>
                ))}
            </div>
            <Separator className="my-1 border-dashed border-black" />
            <div className="space-y-1 text-right">
                 <div className="flex justify-between">
                    <p>Sub-total:</p>
                    <p>{currencySymbol}{formatCurrency(sale.subtotal)}</p>
                </div>
                 {sale.discount > 0 && (
                    <div className="flex justify-between">
                        <p>Descuento:</p>
                        <p className="text-destructive">-{currencySymbol}{formatCurrency(sale.discount)}</p>
                    </div>
                )}
                 <div className="flex justify-between font-bold text-sm">
                    <p>Total:</p>
                    <p>{currencySymbol}{formatCurrency(sale.totalAmount)}</p>
                </div>
            </div>
             {sale.payments && sale.payments.length > 0 && (
                 <>
                <Separator className="my-1 border-dashed border-black" />
                <div className="space-y-1">
                    <p className="font-semibold mb-1 text-center">Pagos:</p>
                    {sale.payments.map((p, index) => (
                        <div key={index} className="flex justify-between">
                            <span>{p.method}:</span>
                            <span>{getPaymentAmountInCorrectCurrency(p)}</span>
                        </div>
                    ))}
                </div>
                </>
            )}
             <Separator className="my-1 border-dashed border-black" />
             <div className="text-center mt-2">
                <p>¡Gracias por su compra!</p>
             </div>
        </div>
    )
};
