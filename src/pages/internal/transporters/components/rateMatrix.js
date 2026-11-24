import { EQUIPMENT_TYPES } from '../../../../services/transportersService';

const sameText = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Turns flat laneRates [{ destination, equipmentType, price, notes }]
 * into a grid: one row per destination, one column per equipment type.
 * Base equipment types are always columns; any other type found becomes an extra column.
 */
export function buildRateMatrix(laneRates = []) {
    const columns = [...EQUIPMENT_TYPES];
    const rows = [];

    laneRates.forEach((lane) => {
        const column = columns.find((c) => sameText(c, lane.equipmentType));
        const equipment = column ?? lane.equipmentType.trim();
        if (!column) columns.push(equipment);

        let row = rows.find((r) => sameText(r.destination, lane.destination));
        if (!row) {
            row = { destination: lane.destination.trim(), prices: {}, notes: '' };
            rows.push(row);
        }

        row.prices[equipment] = lane.price;
        if (!row.notes && lane.notes) row.notes = lane.notes;
    });

    return { columns, rows };
}

/**
 * Turns the grid back into the flat laneRates payload.
 * Empty cells are skipped; the row notes are attached to every lane of that destination.
 * Returns { laneRates } or { error }.
 */
export function flattenRateMatrix(columns, rows) {
    const laneRates = [];
    const seen = [];

    for (const row of rows) {
        const destination = row.destination.trim();
        const filled = columns.filter(
            (c) => row.prices[c] !== '' && row.prices[c] !== null && row.prices[c] !== undefined
        );

        if (!destination && filled.length === 0) continue;

        if (!destination) return { error: 'Every row with prices needs a destination.' };
        if (filled.length === 0) return { error: `"${destination}" has no prices.` };
        if (seen.some((d) => sameText(d, destination))) {
            return { error: `"${destination}" is listed more than once.` };
        }
        seen.push(destination);

        filled.forEach((equipmentType) => {
            laneRates.push({
                destination,
                equipmentType,
                price: Number(row.prices[equipmentType]),
                notes: row.notes.trim() || null,
            });
        });
    }

    return { laneRates };
}
