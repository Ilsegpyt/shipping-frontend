/**
 * The ILS_API contract the dashboard calls in live mode.
 * Every method returns a Promise. Field-level shapes are documented in README.md
 * and can be inspected at runtime with ref.current.apiSpec / ref.current.getSchema().
 */
export const REQUIRED_METHODS = [
  'getCurrentUser',        // () => {id, displayName}
  'loadMaster',            // () => { [listName]: string[] }
  'load',                  // () => {shipments[]}
  'updateOperation',       // (ref, payload) => {}
  'createOperation',       // ({direction, rowCount, shipments, trucks, shared, requestId}) => {ref, at?, day?, trips:[{id}]}
  'updateShipmentStatus',  // (ref, status) => {}
  'loadPermissions',       // () => {reopen_shipments:boolean, delete_shipments:boolean}
  'addMaster',             // (listName, value) => {value}
  'importTrips',           // ({requestId, trips:[{direction, group, fields}]}) => {}
];

export const OPTIONAL_METHODS = [
  'authorizeDeleteShipment', // (ref) => boolean
  'deleteShipment',          // (ref) => {}
  'lockOperation',           // (ref) => {isLocked, lockedByName, lockedAtUtc}
  'unlockOperation',         // (ref) => {unlocked}
  'takeOverOperation',       // (ref) => {isLocked, lockedByName, lockedAtUtc}
  'getStatusAudits',         // (ref) => [{ id, beforeStatus, afterStatus, userId, userName, atUtc }]
  'addTruckUpdate',          // (ref, tripId, note) => {id, text, at, by}
];

/** Throws if `api` does not implement the required methods. */
export function assertApi(api) {
  const missing = REQUIRED_METHODS.filter((m) => typeof api?.[m] !== 'function');
  if (missing.length) throw new Error('ILS_API is missing: ' + missing.join(', '));
  return api;
}
