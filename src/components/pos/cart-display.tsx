"use client";

import type { CartItem, Payment, Product, Sale } from "@/lib/types";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { CheckoutDialog } from "./checkout-dialog";
import { useCurrency } from "@/hooks/use-currency";
import { useRouter } from "next/navigation";
import { ScrollArea } from "../ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { useFirebase, addDocumentNonBlocking } from "@/firebase";
import { collection, doc, getDoc, writeBatch } from "firebase/firestore";

type CartDisplayProps = {
  cart: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  repairJobId?: string;
  allProducts: Product[];
};

export function CartDisplay({ cart, onUpdateQuantity, onRemoveItem, onClearCart, repairJobId, allProducts }: CartDisplayProps) {
  const { firestore } = useFirebase();
  const router = useRouter();
  const { format, getSymbol, currency, convert } = useCurrency();
  const [discount, setDiscount] = useState(0);

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const discountInBase = currency === 'Bs' ? convert(discount, 'Bs', 'USD') : discount;
  const total = subtotal - discountInBase;

  const handleCheckout = async (payments: Payment[]) => {
      if (!firestore) return null;

      const saleData: Omit<Sale, 'id' | 'createdAt'> = {
          items: cart,
          subtotal: subtotal,
          discount: discountInBase,
          totalAmount: total,
          paymentMethod: payments.map(p => p.method).join(', '),
          transactionDate: new Date().toISOString(),
          payments: payments, 
          repairJobId: repairJobId || undefined,
      };

      const salesCollection = collection(firestore, 'sale_transactions');
      const newSaleRef = await addDocumentNonBlocking(salesCollection, saleData);
      const saleId = newSaleRef?.id || `local-${Date.now()}`;

      const batch = writeBatch(firestore);

      cart.forEach(item => {
          if (!item.isRepair && item.productId) {
              const product = allProducts.find(p => p.id === item.productId);
              if (product) {
                  const productRef = doc(firestore, 'products', item.productId);
                  const newStock = product.stockLevel - item.quantity;
                  batch.update(productRef, { stockLevel: newStock });
              }
          }
      });

      if (repairJobId) {
          const repairJobRef = doc(firestore, 'repair_jobs', repairJobId);
          const repairJobDoc = await getDoc(repairJobRef);
          const currentAmountPaid = repairJobDoc.data()?.amountPaid || 0;

          const totalPaidForRepairThisTransaction = payments.reduce((acc, p) => {
              if (p.method === 'Efectivo USD') return acc + p.amount;
              if (p.method === 'Efectivo Bs' || p.method === 'Tarjeta' || p.method === 'Pago Móvil') {
                return acc + convert(p.amount, 'Bs', 'USD');
              }
              return acc;
          }, 0);

          const newTotalPaid = currentAmountPaid + totalPaidForRepairThisTransaction;

          batch.update(repairJobRef, { 
              status: 'Completado', 
              amountPaid: newTotalPaid,
              isPaid: true
          });
      }

      await batch.commit();

      const completedSale: Sale = { ...saleData, id: saleId, createdAt: saleData.transactionDate };
      
      if(repairJobId) {
          router.push('/dashboard/repairs');
          onClearCart();
      }
      
      setDiscount(0);

      return completedSale;
  };


  const currentSymbol = getSymbol();

  return (
    <div className="flex flex-col h-full bg-slate-50">
        <div className="p-4 border-b bg-white">
            <h2 className="text-lg font-semibold">Ticket de Venta</h2>
        </div>
      <ScrollArea className="flex-1 bg-white">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-2/5">PRODUCTO</TableHead>
                    <TableHead className="w-1/5 text-center">CANT</TableHead>
                    <TableHead className="w-1/5 text-right">PRECIO</TableHead>
                    <TableHead className="w-1/5 text-right">TOTAL</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {cart.length === 0 ? (
                     <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                            Añade productos para iniciar una venta.
                        </TableCell>
                    </TableRow>
                ) : (
                    cart.map((item) => (
                        <TableRow key={item.productId}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="text-center">
                                <Input 
                                    type="number" 
                                    value={item.quantity} 
                                    onChange={(e) => onUpdateQuantity(item.productId, parseInt(e.target.value))}
                                    className="w-16 text-center"
                                    disabled={item.isRepair}
                                />
                            </TableCell>
                            <TableCell className="text-right">{currentSymbol}{format(item.price)}</TableCell>
                            <TableCell className="text-right">{currentSymbol}{format(item.price * item.quantity)}</TableCell>
                            <TableCell>
                               <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => onRemoveItem(item.productId)} disabled={item.isRepair}>
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
      </ScrollArea>
      <div className="flex-none p-4 border-t bg-gray-50 space-y-2">
        <div className="flex justify-between text-sm">
            <span>Sub-Total {currentSymbol}</span>
            <span>{format(subtotal)}</span>
        </div>
         <div className="flex justify-between text-sm items-center">
            <span>Descuento {currentSymbol}</span>
            <Input 
                type="number"
                value={discount || ''}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-24 h-8 text-right"
                placeholder="0.00"
            />
        </div>
        <CheckoutDialog cart={cart} total={total} onCheckout={handleCheckout} onClearCart={onClearCart}>
            <Button size="lg" disabled={cart.length === 0} className="w-full h-16 text-2xl bg-green-600 hover:bg-green-700">
                PAGAR: {currentSymbol}{format(total)}
            </Button>
        </CheckoutDialog>
      </div>
    </div>
  );
}
