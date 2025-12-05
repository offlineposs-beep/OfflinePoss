
"use client";

import { useDoc, useFirebase, useMemoFirebase } from "@/firebase";
import type { Currency } from "@/lib/types";
import { doc } from "firebase/firestore";

type AppSettings = {
    currency: Currency;
    bsExchangeRate: number;
}

export const useCurrency = () => {
    const { firestore } = useFirebase();
    const settingsRef = useMemoFirebase(() => 
        firestore ? doc(firestore, 'app-settings', 'main') : null,
        [firestore]
    );
    const { data: settings, isLoading } = useDoc<AppSettings>(settingsRef);

    const currency = settings?.currency || 'USD';
    const bsExchangeRate = settings?.bsExchangeRate || 1;

    const format = (value: number, targetCurrency?: Currency) => {
        const c = targetCurrency || currency;
        
        let displayValue = value;
        let currencySymbol = '$';
        let currencyCode = 'USD';

        if (c === 'Bs') {
            currencySymbol = 'Bs ';
            currencyCode = 'VES';
        }
        
        const formatter = new Intl.NumberFormat('es-VE', {
            style: 'currency',
            currency: currencyCode,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

        return formatter.format(displayValue).replace('VES', '').replace('Bs.S.', '').replace(currencySymbol, '').trim();
    };

    const getSymbol = (targetCurrency?: Currency) => {
        const c = targetCurrency || currency;
        return c === 'Bs' ? 'Bs' : '$';
    }

    const convert = (value: number, from: Currency, to: Currency) => {
        if (from === to) return value;
        if (from === 'USD' && to === 'Bs') return value * bsExchangeRate;
        if (from === 'Bs' && to === 'USD') return value / bsExchangeRate;
        return value;
    }

    return {
        format,
        getSymbol,
        convert,
        currency,
        bsExchangeRate,
        isLoading,
    }
}
