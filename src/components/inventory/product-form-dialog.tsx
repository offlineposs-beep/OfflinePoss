
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
  FormDescription,
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
import { Checkbox } from "../ui/checkbox";
import { Textarea } from "../ui/textarea";

const formSchema = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  category: z.string().min(2, { message: "La categoría es obligatoria." }),
  sku: z.string(),
  costPrice: z.coerce.number().min(0, { message: "El precio de costo debe ser positivo." }),
  retailPrice: z.coerce.number().min(0, { message: "El precio de venta debe ser positivo." }),
  hasPromoPrice: z.boolean().optional(),
  promoPrice: z.coerce.number().optional(),
  stockLevel: z.coerce.number().int({ message: "El stock debe ser un número entero." }).min(1, "El stock debe ser al menos 1."),
  lowStockThreshold: z.coerce.number().int({ message: "El umbral debe ser un número entero." }).min(1, "La alerta debe ser al menos 1."),
  compatibleModels: z.string().optional(),
});

type ProductFormData = z.infer<typeof formSchema>;

type ProductFormDialogProps = {
  product?: Product;
  children: ReactNode;
  productCount?: number;
};

function generateSku(productCount: number) {
    const nextId = productCount + 1;
    return `SKU-${String(nextId).padStart(4, '0')}`;
}

export function ProductFormDialog({ product, children, productCount = 0 }: ProductFormDialogProps) {
  const { firestore } = useFirebase();
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const RETAIL_PROFIT_MARGIN = 2.00; // 100% profit
  const PROMO_PROFIT_MARGIN = 1.60; // 60% profit

  const form = useForm<ProductFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: "",
      sku: "",
      costPrice: 0,
      retailPrice: 0,
      hasPromoPrice: false,
      promoPrice: 0,
      stockLevel: 1,
      lowStockThreshold: 1,
      compatibleModels: "",
    },
  });

  const costPrice = form.watch("costPrice");
  const hasPromo = form.watch("hasPromoPrice");
  const isEditing = !!product;

  useEffect(() => {
    const cost = parseFloat(costPrice as any);
    if (!isNaN(cost) && cost >= 0) {
      const calculatedRetailPrice = cost * RETAIL_PROFIT_MARGIN;
      form.setValue("retailPrice", parseFloat(calculatedRetailPrice.toFixed(2)), { shouldValidate: true });
      
      if(hasPromo) {
        const calculatedPromoPrice = cost * PROMO_PROFIT_MARGIN;
        form.setValue("promoPrice", parseFloat(calculatedPromoPrice.toFixed(2)), { shouldValidate: true });
      } else {
        form.setValue("promoPrice", 0);
      }
    } else {
      form.setValue("retailPrice", 0);
      form.setValue("promoPrice", 0);
    }
  }, [costPrice, hasPromo, form, RETAIL_PROFIT_MARGIN, PROMO_PROFIT_MARGIN]);


  useEffect(() => {
    if (open) {
        if (product) {
            form.reset({
              ...product,
              compatibleModels: product.compatibleModels ? product.compatibleModels.join(", ") : "",
              hasPromoPrice: product.promoPrice && product.promoPrice > 0,
              promoPrice: product.promoPrice || 0,
            });
        } else {
            form.reset({
                name: "",
                category: "",
                sku: generateSku(productCount),
                costPrice: 0,
                retailPrice: 0,
                hasPromoPrice: false,
                promoPrice: 0,
                stockLevel: 1,
                lowStockThreshold: 1,
                compatibleModels: "",
            });
        }
    }
  }, [product, form, open, productCount]);


  function onSubmit(values: ProductFormData) {
    if (!firestore) return;

    const compatibleModelsArray = values.compatibleModels 
      ? values.compatibleModels.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    const finalValues = {
        ...values,
        compatibleModels: compatibleModelsArray,
        promoPrice: values.hasPromoPrice ? values.promoPrice : 0,
    }

    if (product) {
      const productRef = doc(firestore, 'products', product.id!);
      const updateValues = { ...finalValues, sku: product.sku, id: product.id };
      setDocumentNonBlocking(productRef, updateValues, { merge: true });
      toast({ title: "Producto Actualizado", description: `${values.name} ha sido actualizado.` });
    } else {
      const productData = { 
        ...finalValues, 
        id: values.sku,
        reservedStock: 0 
      };
      const productRef = doc(firestore, 'products', productData.id);
      setDocumentNonBlocking(productRef, productData);
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
          <DialogTitle>{isEditing ? 'Editar Producto' : 'Añadir Nuevo Producto'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Actualiza los detalles de este producto.' : 'Rellena los detalles para el nuevo producto.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
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
             <FormField
              control={form.control}
              name="compatibleModels"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modelos Compatibles</FormLabel>
                  <FormControl>
                    <Textarea placeholder="ej. iPhone X, iPhone XS, A2097" {...field} />
                  </FormControl>
                  <FormDescription>Separa los modelos con comas.</FormDescription>
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
                    <FormLabel>SKU</FormLabel>
                    <FormControl>
                      <Input placeholder="Automático" {...field} disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="space-y-2 p-3 border rounded-md">
                <FormField
                    control={form.control}
                    name="costPrice"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Precio de Costo ($)</FormLabel>
                        <FormControl>
                        <Input 
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            {...field}
                             onChange={e => {
                                const value = e.target.value;
                                const regex = /^[0-9]*\.?[0-9]{0,2}$/;
                                if (regex.test(value)) {
                                    field.onChange(value);
                                }
                            }}
                        />
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
                        <FormLabel>Precio Venta (100% Ganancia)</FormLabel>
                        <FormControl>
                        <Input 
                            type="text"
                            inputMode="decimal"
                            {...field}
                        />
                        </FormControl>
                        <FormDescription>Calculado automáticamente. Precio para pagos en Bs.</FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="hasPromoPrice"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0 pt-2">
                             <FormControl>
                                <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">
                                ¿Tiene Precio de Oferta?
                            </FormLabel>
                        </FormItem>
                    )}
                />
                {hasPromo && (
                    <FormField
                        control={form.control}
                        name="promoPrice"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Precio Oferta Efectivo (60% Ganancia)</FormLabel>
                            <FormControl>
                            <Input 
                                type="text"
                                inputMode="decimal"
                                {...field}
                            />
                            </FormControl>
                            <FormDescription>Calculado automáticamente para pagos en efectivo USD.</FormDescription>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                )}
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
              <Button type="submit">{isEditing ? 'Guardar Cambios' : 'Añadir Producto'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
