import { CONTAINER_TYPES } from './constants';

/**
 * Normalizes any backend container type or description to the exact backend enum string
 */
export function normalizeContainerType(type) {
  if (!type) return 'DryStandard40';
  const found = CONTAINER_TYPES.find(
    (c) => c.value.toLowerCase() === String(type).toLowerCase() ||
           c.label.toLowerCase() === String(type).toLowerCase()
  );
  if (found) return found.value;
  const s = String(type).toLowerCase();
  if (s.includes('tank') && s.includes('20')) return 'Tank20';
  if (s.includes('tank')) return 'Tank40';
  if (s.includes('reefer') && s.includes('20')) return 'ReeferStandard20';
  if (s.includes('reefer')) return 'ReeferHigh40';
  if (s.includes('open') && s.includes('high')) return 'OpenTopHigh40';
  if (s.includes('open') && s.includes('20')) return 'OpenTop20';
  if (s.includes('open')) return 'OpenTop40';
  if (s.includes('flat') && s.includes('20')) return 'Flat20';
  if (s.includes('flat') && s.includes('high')) return 'FlatHigh40';
  if (s.includes('flat')) return 'FlatStandard40';
  if (s.includes('45')) return 'DryHigh45';
  if (s.includes('hc') || s.includes('high')) return 'DryHigh40';
  if (s.includes('20')) return 'DryStandard20';
  return 'DryStandard40';
}

export function mapBackendOperationsToFrontend(operations = []) {
  const entry = {
    Import: [],
    Export: [],
  };

  const ships = {
    Import: {},
    Export: {},
  };

  if (!Array.isArray(operations)) {
    return { entry, ships };
  }

  operations.forEach((op) => {
    const isImport = op.operationType === 'Import' || op.operationType === 0;
    const dir = isImport ? 'Import' : 'Export';
    const ref = op.id ? `OPS-${op.id.slice(0, 8).toUpperCase()}` : (op.shipmentNumber || 'OPS-UNKNOWN');

    const containers = Array.isArray(op.containers) && op.containers.length > 0
      ? op.containers
      : [
          // Fallback if an operation has 0 containers in the DB
          {
            id: `${op.id}_dummy_0`,
            ordinal: 1,
            containerNumber: '',
            containerType: 'DryStandard40',
            destination: isImport ? op.importDetails?.destination || '' : '',
          },
        ];

    const rowIndices = [];

    containers.forEach((cntr, idx) => {
      const rowIdx = entry[dir].length;
      rowIndices.push(rowIdx);

      const rowId = cntr.id || `${op.id}_${idx}`;

      const baseRow = {
        _operationId: op.id,
        _containerId: cntr.id,
        _ref: ref,
        _rowId: rowId,
        _operationType: isImport ? 'Import' : 'Export',
        operationType: isImport ? 'Import' : 'Export',
        _createdAtUtc: op.createdAtUtc || '',
        _createdByName: op.createdByName || '',
        createdBy: op.createdByName || '',
        createdAt: op.createdAtUtc || '',
        created: op.createdAtUtc || '',
        shipNo: op.shipmentNumber || '',
        vol: String(op.numberOfContainers || containers.length),
        oper: op.createdByName || '',
        cert: op.certificateNumber || '',
        client: op.clientName || '',
        clientId: op.clientId,
        line: op.shippingLineName || '',
        lineId: op.shippingLineId,
        dest: cntr.destination || (isImport ? op.importDetails?.destination : '') || '',
        size: normalizeContainerType(cntr.containerType),
        cntr: cntr.containerNumber || '',
        updates: Array.isArray(cntr.updates) ? cntr.updates : [],
        trucker: cntr.transporterName || '',
        truckerId: cntr.transporterId || null,
        car: cntr.vehicleCarNumber || '',
        carId: cntr.vehicleId || null,
        driver: cntr.driverName || '',
        driverId: cntr.driverId || null,
        mob: cntr.driverMobileNumber || '',
        checkout: cntr.checkOutFromThePort ? cntr.checkOutFromThePort.slice(0, 10) : '',
        invRcv: op.invoicesReceivedDate ? op.invoicesReceivedDate.slice(0, 10) : '',
        missDoc: cntr.missingDocs || '',
        missRcv: cntr.missingDocsReceivedDate ? String(cntr.missingDocsReceivedDate).slice(0, 10) : '',
        status: op.status || 'Open',
        reopenReason: op.reopenReason || op.ReopenReason || '',
        reopenedAt: op.reopenedAtUtc ? String(op.reopenedAtUtc).slice(0, 10) : (op.ReopenedAtUtc ? String(op.ReopenedAtUtc).slice(0, 10) : ''),
        reopenedAtUtc: op.reopenedAtUtc || op.ReopenedAtUtc || null,
        reopenedBy: (
          op.reopenedByName ||
          (op.reopenedByUserId && op.createdByUserId && String(op.reopenedByUserId).toLowerCase() === String(op.createdByUserId).toLowerCase() ? op.createdByName : '') ||
          op.reopenedBy ||
          op.reopenedByUserId ||
          op.ReopenedByUserId ||
          ''
        ),
        deliveredAt: op.deliveredAtUtc ? String(op.deliveredAtUtc).slice(0, 10) : (op.DeliveredAtUtc ? String(op.DeliveredAtUtc).slice(0, 10) : ''),
        deliveredAtUtc: op.deliveredAtUtc || op.DeliveredAtUtc || null,
        deliveredBy: (
          op.deliveredByName ||
          (op.deliveredByUserId && op.createdByUserId && String(op.deliveredByUserId).toLowerCase() === String(op.createdByUserId).toLowerCase() ? op.createdByName : '') ||
          op.deliveredBy ||
          op.deliveredByUserId ||
          op.DeliveredByUserId ||
          ''
        ),
        arrDate: cntr.actualArrivalDate ? String(cntr.actualArrivalDate).slice(0, 10) : '',
        arrTime: cntr.actualArrivalTime ? String(cntr.actualArrivalTime).slice(0, 5) : '',
        gateOut: cntr.gateOutDate ? String(cntr.gateOutDate).slice(0, 10) : '',
        gateOutT: cntr.gateOutTime ? String(cntr.gateOutTime).slice(0, 5) : '',
      };

      if (isImport) {
        entry.Import.push({
          ...baseRow,
          bl: op.importDetails?.mblNumber || '',
          pod: op.importDetails?.podName || '',
          podId: op.importDetails?.podId || null,
          free: cntr.freeTimeTill ? String(cntr.freeTimeTill).slice(0, 10) : '',
          reqDate: op.importDetails?.requiredOffloadingDate ? String(op.importDetails.requiredOffloadingDate).slice(0, 10) : '',
          reqTime: op.importDetails?.requiredOffloadingTime ? String(op.importDetails.requiredOffloadingTime).slice(0, 5) : '',
        });
      } else {
        entry.Export.push({
          ...baseRow,
          booking: op.exportDetails?.bookingNumber || '',
          clrType: op.exportDetails?.clearanceType || 'CERT',
          customs: op.exportDetails?.customs || '',
          pol: op.exportDetails?.polName || '',
          polId: op.exportDetails?.polId || null,
          pod: op.exportDetails?.podName || '',
          podId: op.exportDetails?.podId || null,
          pow: op.exportDetails?.powName || '',
          powId: op.exportDetails?.powId || null,
          cut: op.exportDetails?.cutOffDate ? String(op.exportDetails.cutOffDate).slice(0, 10) : '',
          reqDate: cntr.requiredLoadingDate ? String(cntr.requiredLoadingDate).slice(0, 10) : '',
          reqTime: cntr.requiredLoadingTime ? String(cntr.requiredLoadingTime).slice(0, 5) : '',
        });
      }
    });

    ships[dir][ref] = {
      id: op.id,
      ref,
      dir,
      status: op.status || 'Open',
      day: op.createdAtUtc ? String(op.createdAtUtc).slice(0, 10) : new Date().toISOString().slice(0, 10),
      user: op.createdByName || '',
      rows: rowIndices,
      unmerged: [],
    };
  });

  return { entry, ships };
}
