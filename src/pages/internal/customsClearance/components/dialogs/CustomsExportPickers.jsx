import { Loader2, Search } from "lucide-react";
import { getShipmentChecklistMeta } from "../../lib/fclExportHelper.js";

export function CustomsColumnsPicker({ picker, fmt }) {
  const { t } = fmt;
  const { availableCols, selectedColKeys, allColsSelected, toggleCol, toggleAllCols } = picker;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
      <div className="flex items-center justify-between pb-2 border-b border-dashed border-slate-200">
        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 select-none">
          <input
            type="checkbox"
            checked={allColsSelected}
            onChange={toggleAllCols}
            className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-3.5 w-3.5 cursor-pointer"
          />
          <span>{t("Columns", "الأعمدة")}</span>
        </label>
        <span className="text-[11px] text-slate-400">
          {selectedColKeys.size} {t("of", "من")} {availableCols.length} {t("selected", "محدد")}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 pt-3 text-xs">
        {availableCols.map((c) => {
          const isChecked = selectedColKeys.has(c.key);
          return (
            <label
              key={c.key}
              title={`${c.en}${c.ar ? ` (${c.ar})` : ""}`}
              className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900 select-none text-[11.5px]"
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggleCol(c.key)}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-3.5 w-3.5 shrink-0 cursor-pointer"
              />
              <span className="truncate">
                <span className="font-medium text-slate-800">{c.en}</span>
                {c.ar && <span className="text-slate-500 font-normal ms-1.5 text-[11px]">({c.ar})</span>}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function CustomsShipmentsPicker({ picker, fmt }) {
  const { t } = fmt;
  const {
    shipments,
    filteredShipments,
    selectedIds,
    allVisibleShipmentsSelected,
    toggleShipment,
    toggleAllShipments,
    loadingShipments,
    loadError,
    searchTerm,
    setSearchTerm,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
  } = picker;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
      <div className="flex flex-col gap-2.5 pb-2 border-b border-dashed border-slate-200">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 select-none shrink-0">
            <input
              type="checkbox"
              checked={allVisibleShipmentsSelected}
              onChange={toggleAllShipments}
              disabled={loadingShipments}
              className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-3.5 w-3.5 cursor-pointer"
            />
            <span>{t("Select all", "تحديد الكل")}</span>
          </label>

          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={13} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("Search shipment #, B/L, booking, cert, ACID or client", "ابحث برقم العملية أو البوليصة أو الحجز أو الشهادة أو العميل")}
              className="w-full text-[11px] rounded-lg border border-slate-300 bg-white ps-8 pe-3 py-1.5 text-slate-800 outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
          <span className="text-[11px] font-medium text-slate-500">{t("Created from", "تاريخ الإنشاء من")}</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="text-xs rounded border border-slate-300 bg-white px-2 py-0.5 text-slate-700 outline-none"
          />
          <span className="text-[11px] font-medium text-slate-500">{t("to", "إلى")}</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="text-xs rounded border border-slate-300 bg-white px-2 py-0.5 text-slate-700 outline-none"
          />
          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => {
                setDateFrom("");
                setDateTo("");
              }}
              className="text-[11px] text-sky-600 hover:underline cursor-pointer"
            >
              {t("Clear dates", "مسح التواريخ")}
            </button>
          )}
        </div>
      </div>

      {loadError && (
        <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-[11px] text-amber-800">
          {loadError}
        </div>
      )}

      <div className="max-h-56 overflow-y-auto pe-1 mt-2.5 rounded-lg border border-slate-200/80 bg-white p-2">
        {loadingShipments ? (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-500">
            <Loader2 size={15} className="animate-spin text-sky-600" />
            <span>{t("Loading shipments…", "جاري تحميل الشحنات…")}</span>
          </div>
        ) : filteredShipments.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">
            {t("No shipments matching search / date criteria.", "لا توجد شحنات مطابقة للبحث أو التاريخ.")}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2 text-xs">
            {filteredShipments.map((s, idx) => {
              const isChecked = selectedIds.has(s.id);
              const { docRef, shipNo, clientName, dateText } = getShipmentChecklistMeta(s, fmt);
              const titleText = `#${idx + 1} · ${docRef}${shipNo ? ` (${shipNo})` : ""} · ${clientName} · ${dateText}`;

              return (
                <label
                  key={s.id}
                  title={titleText}
                  className={`flex items-center gap-2 cursor-pointer p-1.5 rounded-md border text-[11px] transition select-none ${
                    isChecked
                      ? "border-sky-300 bg-sky-50/60 text-slate-900 font-medium"
                      : "border-transparent text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleShipment(s.id)}
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-3.5 w-3.5 shrink-0 cursor-pointer"
                  />
                  <span className="truncate">
                    <span className="font-semibold text-slate-500 me-1">#{idx + 1}</span>
                    <span className="font-bold text-slate-800">{docRef}</span>
                    {shipNo && <span className="text-slate-500 ms-1">({shipNo})</span>}
                    <span className="text-slate-400 mx-1">·</span>
                    <span className="text-slate-600">{clientName}</span>
                    {dateText && (
                      <>
                        <span className="text-slate-400 mx-1">·</span>
                        <span className="text-slate-400 text-[10px]">{dateText}</span>
                      </>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-2 text-end text-[11px] text-slate-500">
        {selectedIds.size} {t("of", "من")} {shipments.length} {t("shipments selected", "شحنة محددة")}
      </div>
    </div>
  );
}
