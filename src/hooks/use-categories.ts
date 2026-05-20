import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Category {
  id: string;
  name_ar: string;
  slug: string;
  image_url: string | null;
  created_at: string;
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return (data as Category[]) ?? [];
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

export function getCategoryLabel(categories: Category[] | undefined, identifier: string | null | undefined): string {
  if (!categories || !identifier) return identifier ?? "";
  const cat = categories.find((c) => c.slug === identifier || c.id === identifier);
  return cat?.name_ar ?? identifier;
}
