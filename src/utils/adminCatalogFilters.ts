interface AdminCatalogItem {
  id: string;
  nombre: string;
  descripcion?: string;
  categoria?: string;
}

interface FilterAdminCatalogOptions<P extends AdminCatalogItem, C extends AdminCatalogItem> {
  productos: P[];
  combos: C[];
  query: string;
  category: string;
}

function normalizeSearchValue(value: string | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function matchesQuery(item: AdminCatalogItem, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  return normalizeSearchValue([
    item.nombre,
    item.descripcion,
    item.categoria,
  ].filter(Boolean).join(' ')).includes(normalizedQuery);
}

export function filterAdminCatalog<
  P extends AdminCatalogItem,
  C extends AdminCatalogItem,
>({
  productos,
  combos,
  query,
  category,
}: FilterAdminCatalogOptions<P, C>): { productos: P[]; combos: C[] } {
  const normalizedQuery = normalizeSearchValue(query);
  const normalizedCategory = normalizeSearchValue(category);

  const filteredProducts = normalizedCategory === 'combos'
    ? []
    : productos.filter((product) => (
      (normalizedCategory === 'todos'
        || normalizeSearchValue(product.categoria) === normalizedCategory)
      && matchesQuery(product, normalizedQuery)
    ));

  const filteredCombos = normalizedCategory === 'todos' || normalizedCategory === 'combos'
    ? combos.filter((combo) => matchesQuery(combo, normalizedQuery))
    : [];

  return { productos: filteredProducts, combos: filteredCombos };
}
