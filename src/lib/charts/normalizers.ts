export function normalizePropertyType(labelRaw: string): string {
	const l = (labelRaw || '').toLowerCase();
	if (l.includes('apart') || l.includes('condo') || l.includes('condom')) return 'Apartamento/Condomínio';
	if (l.includes('cobertura')) return 'Cobertura';
	if (l.includes('duplex') || l.includes('triplex') || l.includes('flat') || l.includes('studio') || l.includes('kit') || l.includes('loft')) return 'Studio/Loft';
	if (l.includes('home') || l.includes('casa') || l.includes('sobrado')) return 'Casa';
	if (l.includes('landlot') || l.includes('land') || l.includes('terreno') || l.includes('lote')) return 'Terreno/Lote';
	if (l.includes('agric') || l.includes('rural') || l.includes('chácara') || l.includes('chacara') || l.includes('sítio') || l.includes('sitio') || l.includes('fazenda')) return 'Rural/Agrícola';
	if (l.includes('comerc') || l.includes('loja') || l.includes('sala') || l.includes('office')) return 'Comercial/Office';
	if (l.includes('industrial') || l.includes('galp')) return 'Industrial/Galpão';
	if (l.includes('hotel') || l.includes('pousada')) return 'Hotel/Pousada';
	if (l.includes('garagem') || l.includes('garage') || l.includes('vaga')) return 'Garagem/Vaga';
	if (l.includes('prédio') || l.includes('predio') || l.includes('edifício') || l.includes('edificio') || l.includes('building') || l.includes('tbuilding')) return 'Prédio/Edifício';
	if (!l.trim().length) return 'Não informado';
	return 'Outros';
}
