
"use client";

import React, { Suspense } from 'react';
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { PlusCircle } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { columns } from "@/components/inventory/columns";
import { ProductFormDialog } from "@/components/inventory/product-form-dialog";
import type { Product } from '@/lib/types';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

// Client component to handle searchParams and state
function InventoryContent() {
    const { firestore } = useFirebase();
    const productsCollection = useMemoFirebase(() =>
        firestore ? collection(firestore, 'products') : null,
        [firestore]
    );
    const { data: products, isLoading } = useCollection<Product>(productsCollection);

    const searchParams = useSearchParams();
    const lowStockFilter = searchParams.get('filter') === 'low-stock';
    const initialFilter: StockFilter = lowStockFilter ? 'low' : 'all';

    const [stockFilter, setStockFilter] = useState<StockFilter>(initialFilter);

    const filteredProducts = useMemo(() => {
        if (!products) return [];
        if (stockFilter === 'low') {
            return products.filter(p => p.stockLevel > 0 && p.stockLevel <= p.lowStockThreshold);
        }
        if (stockFilter === 'out') {
            return products.filter(p => p.stockLevel === 0);
        }
        return products;
    }, [products, stockFilter]);

    return (
        <>
            <PageHeader title="Inventario">
                <ProductFormDialog>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Añadir Producto
                    </Button>
                </ProductFormDialog>
            </PageHeader>
            <main className="flex-1 p-4 sm:p-6">
                <Tabs value={stockFilter} onValueChange={(value) => setStockFilter(value as StockFilter)} className="mb-4">
                    <TabsList>
                        <TabsTrigger value="all">Todos</TabsTrigger>
                        <TabsTrigger value="low">Stock Bajo</TabsTrigger>
                        <TabsTrigger value="out">Sin Stock</TabsTrigger>
                    </TabsList>
                </Tabs>
                <DataTable 
                    columns={columns} 
                    data={filteredProducts}
                    isLoading={isLoading}
                    filterColumnId="name"
                    filterPlaceholder="Filtrar por nombre de producto..."
                />
            </main>
        </>
    );
}

type StockFilter = 'all' | 'low' | 'out';

function Page() {
  return (
    <Suspense fallback={<div>Cargando inventario...</div>}>
      <InventoryContent />
    </Suspense>
  )
}

export default Page;
