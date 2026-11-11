/**
 * The ILS_API contract the dashboard calls in live mode.
 * Every method returns a Promise. Field-level shapes are documented in README.md
 * and can be inspected at runtime with ref.current.apiSpec / ref.current.getSchema().
 */
export const REQUIRED_METHODS = [
  'getCurrentUser',        // () => {id, displayName}
  'loadMaster',            // () => { [listName]: string[] }
  'load',                  // () => {version, shipments[]}
  'saveWorkspace',         // ({version, shipments[]}) => {version}        409 on version conflict
  'createOperation',       // ({direction, rowCount, shipments, trucks, shared, requestId}) => {ref, version, at?, day?, trips:[{id}]}
  'updateShipmentStatus',  // (ref, status, version) => {version}
  'loadPermissions',       // () => {reopen_shipments:boolean, delete_shipments:boolean}
  'addMaster',             // (listName, value) => {value}
  'importTrips',           // ({requestId, trips:[{direction, group, fields}]}) => {version}
];

export const OPTIONAL_METHODS = [
  'authorizeDeleteShipment', // (ref) => boolean
  'deleteShipment',          // (ref, version) => {version}
];

/** Throws if `api` does not implement the required methods. */
export function assertApi(api) {
  const missing = REQUIRED_METHODS.filter((m) => typeof api?.[m] !== 'function');
  if (missing.length) throw new Error('ILS_API is missing: ' + missing.join(', '));
  return api;
}
