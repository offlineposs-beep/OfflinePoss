
"use client";

import type { Product } from "@/lib/types";
import { Card, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { useMemo, useState } from "react";
import { ScrollArea } from "../ui/scroll-area";
import { useCurrency } from "@/hooks/use-currency";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "../ui/skeleton";
import { TicketPercent, Search } from "lucide-react";
import { Input } from "../ui/input";

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
            (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (product.compatibleModels && product.compatibleModels.some(model => model.toLowerCase().includes(searchTerm.toLowerCase()))))
    );
  }, [products, activeCategory, searchTerm]);

  return (
    <div className="flex flex-col h-full">
        <div className="flex flex-col gap-4 mb-4">
            <Tabs value={activeCategory} onValueChange={setActiveCategory}>
                <TabsList>
                    {categories.map(cat => (
                        <TabsTrigger key={cat} value={cat}>{cat}</TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Buscar por nombre, SKU, modelo compatible..."
                    className="w-full pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>
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
                ) : filteredProducts.map((product) => {
                    const availableStock = product.stockLevel - (product.reservedStock || 0);
                    const hasPromo = product.promoPrice && product.promoPrice > 0;
                    const displayPrice = product.retailPrice; 

                    return (
                        <Card
                            key={product.id}
                            onClick={() => onProductSelect(product)}
                            className={cn(
                                "cursor-pointer hover:border-primary transition-colors flex flex-col justify-between",
                                availableStock <= 0 && "opacity-50 cursor-not-allowed hover:border-input"
                            )}
                        >
                            <CardHeader className="p-2">
                                <CardTitle className="text-sm font-medium leading-tight">{product.name}</CardTitle>
                                {product.compatibleModels && product.compatibleModels.length > 0 && (
                                  <p className="text-xs text-muted-foreground truncate pt-1">{product.compatibleModels.join(', ')}</p>
                                )}
                            </CardHeader>
                            <CardFooter className="p-2 flex justify-between items-center">
                                <p className="text-xs text-muted-foreground">Disp: {availableStock}</p>
                                <div className={cn("text-xs font-bold", hasPromo && "text-primary")}>
                                  {hasPromo && <TicketPercent className="w-3 h-3 inline-block mr-1 text-green-600"/>}
                                  {getSymbol()}{format(displayPrice)}
                                </div>
                            </CardFooter>
                        </Card>
                    )
                })}
            </div>
          </ScrollArea>
        </div>
    </div>
  );
}
