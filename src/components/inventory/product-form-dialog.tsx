
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
import type { Product } from "@/lib/types";
import { useState, type ReactNode, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useFirebase, setDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { format } from "date-fns";

const formSchema = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  category: z.string().min(2, { message: "La categoría es obligatoria." }),
  sku: z.string().min(1, { message: "El SKU es obligatorio." }),
  costPrice: z.coerce.number().min(0, { message: "El precio de costo debe ser positivo." }),
  retailPrice: z.coerce.number().min(0, { message: "El precio de venta debe ser positivo." }),
  stockLevel: z.coerce.number().int({ message: "El stock debe ser un número entero." }),
  lowStockThreshold: z.coerce.number().int({ message: "El umbral debe ser un número entero." }),
});

type ProductFormData = z.infer<typeof formSchema>;

type ProductFormDialogProps = {
  product?: Product;
  children: ReactNode;
};

function generateProductId() {
    const date = new Date();
    const datePart = format(date, 'yyMMdd');
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    return `PROD-${datePart}-${randomPart}`;
}


export function ProductFormDialog({ product, children }: ProductFormDialogProps) {
  const { firestore } = useFirebase();
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<ProductFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: "",
      sku: "",
      costPrice: 0,
      retailPrice: 0,
      stockLevel: 0,
      lowStockThreshold: 5,
    },
  });

  useEffect(() => {
    if (open) {
        if (product) {
            form.reset(product);
        } else {
            form.reset({
                name: "",
                category: "",
                sku: "",
                costPrice: 0,
                retailPrice: 0,
                stockLevel: 0,
                lowStockThreshold: 5,
            });
        }
    }
  }, [product, form, open]);


  function onSubmit(values: ProductFormData) {
    if (!firestore) return;

    if (product) {
      const productRef = doc(firestore, 'products', product.id!);
      setDocumentNonBlocking(productRef, values, { merge: true });
      toast({ title: "Producto Actualizado", description: `${values.name} ha sido actualizado.` });
    } else {
      const productId = generateProductId();
      const productRef = doc(firestore, 'products', productId);
      setDocumentNonBlocking(productRef, { ...values, id: productId, reservedStock: 0 });
      toast({ title: "Producto Añadido", description: `${values.name} ha sido añadido al inventario.` });
    }
    setOpen(false);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{product ? 'Editar Producto' : 'Añadir Nuevo Producto'}</DialogTitle>
          <DialogDescription>
            {product ? 'Actualiza los detalles de este producto.' : 'Rellena los detalles para el nuevo producto.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Producto</FormLabel>
                  <FormControl>
                    <Input placeholder="ej. Pantalla iPhone 14" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría</FormLabel>
                    <FormControl>
                      <Input placeholder="ej. Pantallas" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU / Código de Barras</FormLabel>
                    <FormControl>
                      <Input placeholder="IP14-SCR" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="costPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio de Costo ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="retailPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio de Venta ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="stockLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Actual</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="lowStockThreshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alerta de Stock Bajo</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit">{product ? 'Guardar Cambios' : 'Añadir Producto'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
