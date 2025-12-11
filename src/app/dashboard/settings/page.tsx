"use client";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
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
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useDoc, useFirebase, useMemoFirebase, setDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
import { useEffect } from "react";
import type { AppSettings } from "@/lib/types";

const settingsSchema = z.object({
    currency: z.enum(['USD', 'Bs']),
    bsExchangeRate: z.coerce.number().positive("La tasa de cambio debe ser un número positivo."),
    lastUpdated: z.string().optional(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
    const { toast } = useToast();
    const { firestore } = useFirebase();
    
    const settingsRef = useMemoFirebase(() => 
        firestore ? doc(firestore, 'app-settings', 'main') : null,
        [firestore]
    );
    const { data: settings, isLoading } = useDoc<AppSettings>(settingsRef);

    const form = useForm<SettingsFormData>({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            currency: 'USD',
            bsExchangeRate: 36.5,
        }
    });

    useEffect(() => {
        if (settings) {
            form.reset(settings);
        }
    }, [settings, form]);


    const handleSettingsSave = (values: SettingsFormData) => {
        if (!settingsRef) return;
        const updatedValues = {
            ...values,
            lastUpdated: new Date().toISOString()
        };
        setDocumentNonBlocking(settingsRef, updatedValues, { merge: true });
        toast({
            title: "Configuración Guardada",
            description: "La configuración de la moneda y tasa ha sido actualizada.",
        });
    }

    const handleResetData = () => {
        toast({
            variant: "destructive",
            title: "Acción no implementada",
            description: "El reseteo de datos debe configurarse en el backend por seguridad.",
        });
    }

    return (
        <>
            <PageHeader title="Configuración" />
            <main className="flex-1 p-4 sm:p-6 space-y-6">
                <Card className="max-w-2xl">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSettingsSave)}>
                            <CardHeader>
                                <CardTitle>Moneda y Tasa de Cambio</CardTitle>
                                <CardDescription>
                                    Configura la moneda principal y la tasa de cambio para Bolívares.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {isLoading ? <p>Cargando configuración...</p> :
                                <>
                                <FormField
                                    control={form.control}
                                    name="currency"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Moneda Principal de la Tienda</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="w-[280px]">
                                                        <SelectValue placeholder="Seleccionar moneda" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="USD">Dólar Americano (USD)</SelectItem>
                                                    <SelectItem value="Bs">Bolívar (Bs)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>Define la moneda principal para mostrar los precios en el POS.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="bsExchangeRate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tasa de Cambio (1 USD a Bs)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" step="0.01" placeholder="Ej: 36.50" {...field} className="max-w-[280px]" />
                                                </FormControl>
                                            <FormDescription>Tasa del día para conversiones (ej. BCV).</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                </>}
                            </CardContent>
                            <CardFooter className="border-t px-6 py-4">
                                <Button type="submit" disabled={form.formState.isSubmitting || isLoading}>Guardar Cambios</Button>
                            </CardFooter>
                        </form>
                    </Form>
                </Card>

                <Card className="max-w-2xl">
                    <CardHeader>
                        <CardTitle>Zona de Peligro</CardTitle>
                        <CardDescription>
                            Estas acciones son destructivas y no se pueden deshacer.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Restablecer Todos los Datos
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás absolutely seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción es irreversible y debe ser manejada a través de funciones de backend seguras, lo cual no está implementado en esta demo.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleResetData} className="bg-destructive hover:bg-destructive/90">
                                    Entendido
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardContent>
                </Card>
            </main>
        </>
    )
}

    