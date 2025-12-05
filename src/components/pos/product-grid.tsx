"use client";

import type { Product } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { useMemo, useState } from "react";
import { ScrollArea } from "../ui/scroll-area";
import { useCurrency } from "@/hooks/use-currency";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "../ui/skeleton";

type ProductGridProps = {
  products: Product[];
  onProductSelect: (product: Product) => void;
  isLoading?: boolean;
};

export function ProductGrid({ products, onProductSelect, isLoading }: ProductGridProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const { format, getSymbol } = useCurrency();

  const categories = useMemo(() => {
    if (!products) return ['Todos'];
    const cats = products.map(p => p.category);
    return ['Todos', ...Array.from(new Set(cats))];
  }, [products]);

  const [activeCategory, setActiveCategory] = useState('Todos');

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(
        (product) =>
        (activeCategory === 'Todos' || product.category === activeCategory) &&
        (product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase())))
    );
  }, [products, activeCategory, searchTerm]);

  return (
    <div className="flex flex-col h-full">
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-4">
            <TabsList>
                {categories.map(cat => (
                    <TabsTrigger key={cat} value={cat}>{cat}</TabsTrigger>
                ))}
            </TabsList>
        </Tabs>
        <div className="relative flex-1">
          <ScrollArea className="absolute inset-0">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {isLoading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                        <Card key={`skeleton-${i}`}>
                            <CardHeader className="p-2">
                               <Skeleton className="h-4 w-3/4" />
                            </CardHeader>
                            <CardFooter className="p-2 flex justify-end">
                                <Skeleton className="h-4 w-1/4" />
                            </CardFooter>
                        </Card>
                    ))
                ) : filteredProducts.map((product) => (
                <Card
                    key={product.id}
                    onClick={() => onProductSelect(product)}
                    className={cn(
                        "cursor-pointer hover:border-primary transition-colors flex flex-col justify-between",
                        product.stockLevel <= 0 && "opacity-50 cursor-not-allowed hover:border-input"
                    )}
                >
                    <CardHeader className="p-2">
                        <CardTitle className="text-sm font-medium leading-tight">{product.name}</CardTitle>
                    </CardHeader>
                    <CardFooter className="p-2 flex justify-end">
                        <p className="text-xs font-bold">{getSymbol()}{format(product.retailPrice)}</p>
                    </CardFooter>
                </Card>
                ))}
            </div>
          </ScrollArea>
        </div>
    </div>
  );
}
