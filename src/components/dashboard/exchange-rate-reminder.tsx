"use client";

import { useDoc, useFirebase, useMemoFirebase } from "@/firebase";
import type { AppSettings } from "@/lib/types";
import { doc } from "firebase/firestore";
import { isToday, parseISO } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "../ui/button";
import Link from "next/link";
import { Skeleton } from "../ui/skeleton";

export function ExchangeRateReminder() {
    const { firestore } = useFirebase();
    const settingsRef = useMemoFirebase(() => 
        firestore ? doc(firestore, 'app-settings', 'main') : null,
        [firestore]
    );
    const { data: settings, isLoading } = useDoc<AppSettings>(settingsRef);

    if (isLoading) {
        return (
            <div className="p-4 border-b">
                 <Skeleton className="h-14 w-full" />
            </div>
        );
    }
    
    const needsUpdate = !settings?.lastUpdated || !isToday(parseISO(settings.lastUpdated));

    if (!needsUpdate) {
        return null;
    }

    return (
        <div className="p-4 border-b">
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>¡Atención!</AlertTitle>
                <div className="flex justify-between items-center">
                    <AlertDescription>
                        La tasa de cambio del dólar no ha sido actualizada hoy. Esto puede afectar tus cálculos de precios.
                    </AlertDescription>
                     <Link href="/dashboard/settings" legacyBehavior>
                        <Button variant="destructive">Actualizar Tasa</Button>
                    </Link>
                </div>
            </Alert>
        </div>
    );
}
