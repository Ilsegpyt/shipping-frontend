/* Static dashboard markup, taken from the <body> of FTL_Airport_Dashboard.html.
   The engine owns this DOM imperatively, so React never re-renders it. */
import { LOGO_SRC } from '../assets/logo.js';

export const getMarkup = () => `

<header style="display:none">
  <svg id="waves" viewBox="0 0 1200 26" preserveAspectRatio="none"><path d="M0 21 H1200 V26 H0 Z" fill="#bff0f7" opacity=".85"/><path d="M0 13 H1200" stroke="#dff4f8" stroke-width="2.2" stroke-dasharray="30 24" opacity=".7"/></svg>
  <div class="logo"><img id="logoImg" src="${LOGO_SRC}" alt="ILS Egypt"></div>
  <div class="vdiv"></div>
  <div><div class="h-kicker"><svg class="glyph" viewBox="0 0 36 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M2 13l11-2 6-8h3l-3 8 10-1 4-3h2l-2 5 2 5h-2l-4-3-10-1 3 8h-3l-6-8-11-2z"/></svg><span id="hKicker">ILS EGYPT · FTL AIRPORT</span></div><div class="h-title disp" id="hTitle">FTL Airport Dashboard</div><div class="h-sub" id="hSub">Air shipments · Import & Export · Operations</div></div>
  <div class="spacer"></div>
  <span class="tag" id="dataTag">No data loaded</span>
  <button class="hbtn" id="qualityBtn" onclick="__FTL__.openQuality()" style="display:none">Data quality</button>
  
  <input type="file" id="fileInput" accept=".xlsx,.xls" multiple>
  <button class="hbtn" id="uploadBtn" onclick="__FTL__.openTptUpload()" style="display:none">Upload File</button>
  <button class="hbtn" id="entryBtn" onclick="__FTL__.showEntry(true)" style="display:none">Data entry</button>
  <button class="hbtn" id="dashBtn" onclick="__FTL__.showEntry(false);__FTL__.showDash(true)" style="display:none">Dashboard</button>
  <button class="hbtn" id="clearBtn" onclick="__FTL__.clearData()" title="مسح وتفريغ الجدول للبدء من جديد">Clear</button>
  <button class="hbtn" id="exportBtn" onclick="__FTL__.openExport()" style="display:none">Export Dashboard</button>
  <button class="hbtn" id="helpBtn" onclick="__FTL__.openHelp()">Help</button>
  <button class="hbtn" id="langBtn" onclick="__FTL__.toggleLang()">عربي</button>
  <button class="hbtn" id="themeBtn" onclick="__FTL__.toggleTheme()" aria-label="Theme">🌙</button>
  <button class="hbtn" id="panelToggle" onclick="__FTL__.togglePanel()" style="display:none">Fields</button>
</header>

<div class="wrap">
<main>
  <section id="entryView" style="display:none">
    <div class="opwrap">
      <div class="opcard" id="opForm">
        <div class="ophead">
          <div><div class="opref" id="opRef">OPS-…</div><div class="opsub" id="opSub"></div></div>
          <button class="ebtn" id="opToggle" onclick="__FTL__.toggleOpForm()"></button>
        </div>
        <div class="opgrid" id="opGrid"></div>
        <div class="opfoot">
          <div class="opcount"><label id="lOpCount"></label><div class="opstepper" role="group" aria-label="Transport row count"><button type="button" id="opCountMinus" onclick="__FTL__.stepOpCount(-1)" aria-label="Decrease">−</button><input type="text" inputmode="numeric" id="opCount" min="1" max="200" value="1" aria-label="Count"><button type="button" id="opCountPlus" onclick="__FTL__.stepOpCount(1)" aria-label="Increase">+</button></div></div>
          <button class="ebtn go" id="opCreate" onclick="__FTL__.createOperation()"></button>
          <span class="ophint" id="opHint"></span>
        </div>
      </div>
    </div>

    <div class="ebar">
      <div class="etabs">
        <button class="etab on" data-dir="Import"><span class="ico">↓</span><span class="lbl"></span><span class="cnt"></span></button>
        <button class="etab" data-dir="Export"><span class="ico">↑</span><span class="lbl"></span><span class="cnt"></span></button>
        <button type="button" class="ebtn ebtn-delivered" id="deliveredOpen" onclick="__FTL__.openDelivered()">Delivered shipments (0)</button>
        <button type="button" class="ebtn ebtn-inactive" id="inactiveOpen" onclick="__FTL__.openInactive()">Inactive shipments (0)</button>
        <button type="button" class="ebtn" id="entryUpload" onclick="__FTL__.openTptUpload()">Upload File</button>
        <button type="button" class="ebtn" id="entryClearBtn" onclick="__FTL__.clearData()" style="color:#e03131;border-color:#ffa8a8;background:#fff5f5" title="مسح وتفريغ كل البيانات للبدء من جديد">🗑 مسح الكل</button>
      </div>
      <div class="espacer"></div>
      <div id="eStatus" class="estatus"></div>
      <button class="ebtn" onclick="__FTL__.openTripExport()" id="eSave"></button>
      <button class="ebtn" onclick="__FTL__.emailEntry()" id="eMail"></button>
      <button class="ebtn" onclick="__FTL__.toggleLang()" id="ebarLang">عربي</button>
      <button class="ebtn go" id="eApply" onclick="__FTL__.applyEntry()" style="display:none"></button>
    </div>
    <div class="sysbar">
      <span class="chipst" id="sysSaved"></span>
      <span class="chipst muted" id="sysUser"></span>
      <span class="chipst muted" id="sysOps"></span>
      <span class="spacer"></span>
    </div>
    <div class="triptools"><div class="tripsearch" id="tripSearch"></div><span id="tripSearchCount" class="tripcount"></span><div class="tripsort"><label for="tripSortKey" id="tripSortLabel">Sort by</label><select id="tripSortKey"></select><select id="tripSortDir" aria-label="Sort direction"><option value="asc">A → Z</option><option value="desc">Z → A</option></select></div><span class="tripgrow"></span><button class="ebtn" id="tripCopy" onclick="__FTL__.copySelectedTrips()" disabled></button></div>
    <div class="trip-page" id="tripPage" hidden><span id="tripPageInfo"></span><button type="button" id="tripPagePrev" aria-label="Previous shipments">‹</button><button type="button" id="tripPageNext" aria-label="Next shipments">›</button></div>
    <div class="egrid"><table id="eTable"><thead id="eHead"></thead><tbody id="eBody"></tbody></table><div id="eEmpty" class="eempty" style="display:none"></div></div>
    <div id="eLists" hidden></div>
    <div class="modal" id="deliveredModal"><div class="box delivered-box"><div class="delivered-title"><h2 id="deliveredTitle">Delivered shipments</h2><button type="button" class="ebtn" onclick="__FTL__.closeM('deliveredModal')" aria-label="Close">✕</button></div><p id="deliveredCount"></p><div class="delivered-tools"><button type="button" class="ebtn" id="deliveredSelectAll" onclick="__FTL__.toggleAllDelivered()"></button><button type="button" class="ebtn" id="deliveredCopy" onclick="__FTL__.copyDeliveredTrips()" disabled></button><button type="button" class="ebtn" id="deliveredExport" onclick="__FTL__.openTripExport('delivered')"></button><button type="button" class="ebtn" id="deliveredMail" onclick="__FTL__.openMail('excel','delivered')"></button></div><div class="triptools delivered-filters"><div class="tripsearch" id="deliveredSearch"></div><span class="tripgrow"></span><div class="tripsort"><label for="deliveredSortKey" id="deliveredSortLabel">Sort by</label><select id="deliveredSortKey"></select><select id="deliveredSortDir" aria-label="Sort direction"><option value="asc">Ascending ↑</option><option value="desc">Descending ↓</option></select></div></div><div class="delivered-actions" id="deliveredActions" hidden><label id="reopenLabel" for="reopenShipment"></label><select id="reopenShipment"></select><button type="button" class="ebtn" id="reopenAction" onclick="__FTL__.reopenSelectedShipment()"></button></div><div class="trip-page" id="deliveredPage"><button type="button" id="deliveredPrev" onclick="__FTL__.pageDelivered(-1);__FTL__.renderDelivered()">‹</button><span id="deliveredPageInfo"></span><button type="button" id="deliveredNext" onclick="__FTL__.pageDelivered(1);__FTL__.renderDelivered()">›</button></div><div class="delivered-scroll"><table id="deliveredTable"><thead id="deliveredHead"></thead><tbody id="deliveredBody"></tbody></table></div></div></div>
  </section>

  <div id="dash" style="display:none">
    <div class="dtabs" id="dirTabs">
      <button class="dtab on" data-dir="Import" id="dtImp"><span class="ico">↓</span><span class="lbl"></span><span class="cnt"></span></button>
      <button class="dtab" data-dir="Export" id="dtExp"><span class="ico">↑</span><span class="lbl"></span><span class="cnt"></span></button>
      <button class="dtab" data-dir="FCL" id="dtFcl" style="display:none" tabindex="-1" aria-hidden="true"><span class="ico">⇄</span><span class="lbl">FCL</span><span class="cnt"></span></button>
    </div>
    <select id="fDir" style="display:none"><option value=""></option></select>

    <section id="fclPanel" hidden>
      <div class="fcl-intro"><h2>FCL · Full Container Load</h2><p id="fclExplanation"></p></div>
      <div class="fcl-filters"><label id="fclLineLabel">Shipping line <select id="fclLine"></select></label><label id="fclSizeLabel">Container type <select id="fclSize"></select></label><label id="fclPortLabel">Transfer port <select id="fclPort"></select></label><label id="fclWindowLabel">Time window <select id="fclHours"><option value="24">24 hours</option><option value="12">12 hours</option><option value="6">6 hours</option></select></label></div>
      <div class="fcl-metrics" id="fclMetrics"></div><div id="fclCards" class="fcl-cards"></div>
    </section>
    <div class="rail">
      <div class="rrow">
        <div class="fld"><label for="dateBasis" id="lBasis">Date basis</label>
          <select id="dateBasis"><option value="load">Offloading date</option><option value="reqDate">Required offloading</option><option value="actDate">Actual offloading</option><option value="gateIn">Gate in</option><option value="free">Free-time end</option></select></div>
        <div class="fld"><label for="dFrom" id="lFrom">From</label><input type="date" id="dFrom"></div>
        <div class="fld"><label for="dTo" id="lTo">To</label><input type="date" id="dTo"></div>
        <div class="fld"><label id="lQuick">Quick range</label>
          <div class="presets"><button class="chip" data-preset="30">Last 30 days</button><button class="chip" data-preset="90">Last 90 days</button><button class="chip on" data-preset="all">All time</button></div></div>
        <div class="fld"><label for="cFrom" id="lCreatedFrom">Created from</label><input type="date" id="cFrom"></div>
        <div class="fld"><label for="cTo" id="lCreatedTo">Created to</label><input type="date" id="cTo"></div>
        <div class="fld"><label id="deliveryFilterLabel" for="deliveryFilter">Delivery</label><select id="deliveryFilter"><option value="All">All shipments</option><option value="Open">Open</option><option value="Delivered">Delivered</option></select></div>
        <button class="reset" id="resetBtn" onclick="__FTL__.resetFilters()">Clear filters</button>
      </div>
      <div class="rsep"></div>
      <div class="rrow">
        <div class="fld"><label for="fClient" id="lClient">Client</label><select id="fClient"><option value="">All clients</option></select></div>
        <div class="fld"><label for="fTrucker" id="lTrucker">Trucker</label><select id="fTrucker"><option value="">All truckers</option></select></div>
        <div class="fld"><label for="fDest" id="lDest">Site</label><select id="fDest"><option value="">All sites</option></select></div>
                <div class="fld"><label for="fOper" id="lOper">Operations staff</label><select id="fOper"><option value="">Everyone</option></select></div>
        <div class="fld"><label for="fLine" id="lLine">Shipping line</label><select id="fLine"><option value="">All lines</option></select></div>
        <div class="fld" id="fldPort"><label for="fPort" id="lPort">Port</label><select id="fPort"><option value="">All ports</option></select></div>
        <div class="fld" id="fldFrom"><label for="fFrom" id="lFrom2">FROM</label><select id="fFrom"><option value="">All</option></select></div>
        <div class="fld" id="fldTo"><label for="fTo" id="lTo2">TO</label><select id="fTo"><option value="">All</option></select></div>
        <div class="fld" id="fldRisk"><label for="fRisk" id="lRisk">Demurrage</label><select id="fRisk"><option value="">All trips</option></select></div>
      </div>
    </div>
    <div id="activeNote"></div>

    <div class="kpis">
      <div class="kpi" id="kpiTrips"><div class="k-top"><span class="k-ico">🚛</span><span class="k-label" id="lTrips"></span></div><div class="k-val" id="kTrips">–</div><div class="k-sub" id="kTripsSub"></div><div class="spark" id="sTrips"></div></div>
      <div class="kpi aqua" id="kpiCont"><div class="k-top"><span class="k-ico">📦</span><span class="k-label" id="lCont"></span></div><div class="k-val" id="kCont">–</div><div class="k-sub" id="kContSub"></div><div class="spark" id="sCont"></div></div>
      <div class="kpi" id="kpiClients"><div class="k-top"><span class="k-ico">🏭</span><span class="k-label" id="lClients"></span></div><div class="k-val" id="kClients">–</div><div class="k-sub" id="kClientsSub"></div></div>
      <div class="kpi sand" id="kpiTruckers"><div class="k-top"><span class="k-ico">🤝</span><span class="k-label" id="lTruckers"></span></div><div class="k-val" id="kTruckers">–</div><div class="k-sub" id="kTruckersSub"></div></div>
      <div class="kpi bad" id="kpiRisk"><div class="k-top"><span class="k-ico">⚠️</span><span class="k-label" id="lRiskK"></span></div><div class="k-val" id="kRisk">–</div><div class="k-sub" id="kRiskSub"></div></div>
      <div class="kpi good" id="kpiFree"><div class="k-top"><span class="k-ico">🕓</span><span class="k-label" id="lFree"></span></div><div class="k-val" id="kFree">–</div><div class="k-sub" id="kFreeSub"></div></div>
      <div class="kpi" id="kpiOper"><div class="k-top"><span class="k-ico">👥</span><span class="k-label" id="lOperK"></span></div><div class="k-val" id="kOper">–</div><div class="k-sub" id="kOperSub"></div></div>
      <div class="kpi warn" id="kpiTrucks"><div class="k-top"><span class="k-ico">🚚</span><span class="k-label" id="lTrucks"></span></div><div class="k-val" id="kTrucks">–</div><div class="k-sub" id="kTrucksSub"></div></div>
      <div class="kpi good" id="kpiCut"><div class="k-top"><span class="k-ico">⏰</span><span class="k-label" id="lCut"></span></div><div class="k-val" id="kCut">–</div><div class="k-sub" id="kCutSub"></div></div>
      <div class="kpi" id="kpiShip"><div class="k-top"><span class="k-ico">📄</span><span class="k-label" id="lShip"></span></div><div class="k-val" id="kShip">–</div><div class="k-sub" id="kShipSub"></div></div>
      <div class="kpi good" id="kpiOnTime"><div class="k-top"><span class="k-ico">🎯</span><span class="k-label" id="lOnTime"></span></div><div class="k-val" id="kOnTime">–</div><div class="k-sub" id="kOnTimeSub"></div></div>
      <div class="kpi bad" id="kpiOffDelay"><div class="k-top"><span class="k-ico">⏱️</span><span class="k-label" id="lOffDelay"></span></div><div class="k-val" id="kOffDelay">–</div><div class="k-sub" id="kOffDelaySub"></div></div>
      <div class="kpi" id="kpiTransit"><div class="k-top"><span class="k-ico">🛣️</span><span class="k-label" id="lTransit"></span></div><div class="k-val" id="kTransit">–</div><div class="k-sub" id="kTransitSub"></div></div>
      <div class="kpi aqua" id="kpiDestU"><div class="k-top"><span class="k-ico">📍</span><span class="k-label" id="lDestU"></span></div><div class="k-val" id="kDestU">–</div><div class="k-sub" id="kDestUSub"></div></div>
      <div class="kpi" id="kpiPortU"><div class="k-top"><span class="k-ico">⚓</span><span class="k-label" id="lPortU"></span></div><div class="k-val" id="kPortU">–</div><div class="k-sub" id="kPortUSub"></div></div>
      <div class="kpi aqua" id="kpiRoute"><div class="k-top"><span class="k-ico">🛣️</span><span class="k-label" id="lRoute"></span></div><div class="k-val" id="kRoute">–</div><div class="k-sub" id="kRouteSub"></div></div>
    </div>

    <div class="card insights" id="insCard"><h3 id="insH"></h3><div class="sub" id="insSub"></div><ul id="insightList"></ul></div>

    <div class="grid">
      <div class="card s8"><h3 data-c="chMonthly"></h3><div class="sub"></div><div class="ch"><canvas id="chMonthly"></canvas></div></div>
      <div class="card s4"><h3 data-c="chDir"></h3><div class="sub"></div><div class="ch"><canvas id="chDir"></canvas></div></div>

      <div class="card s12"><h3 data-c="chDaily"></h3><div class="sub"></div><div class="ch"><canvas id="chDaily"></canvas></div></div>

      <div class="card s6"><h3 data-c="chClient"></h3><div class="sub"></div><div class="ch"><canvas id="chClient"></canvas></div></div>
      <div class="card s6"><h3 data-c="chTrucker"></h3><div class="sub"></div><div class="ch"><canvas id="chTrucker"></canvas></div></div>

      <div class="card s7"><h3 data-c="chRiskClient"></h3><div class="sub"></div><div class="ch"><canvas id="chRiskClient"></canvas></div></div>
      <div class="card s5"><h3 data-c="chFree"></h3><div class="sub"></div><div class="ch"><canvas id="chFree"></canvas></div></div>

      <div class="card s5"><h3 data-c="chDest"></h3><div class="sub"></div><div class="ch"><canvas id="chDest"></canvas></div></div>
      <div class="card s4"><h3 data-c="chLine"></h3><div class="sub"></div><div class="ch"><canvas id="chLine"></canvas></div></div>
      <div class="card s6"><h3 data-c="chPort"></h3><div class="sub"></div><div class="ch"><canvas id="chPort"></canvas></div></div>
      <div class="card s6"><h3 data-c="chRoute"></h3><div class="sub"></div><div class="ch"><canvas id="chRoute"></canvas></div></div>
      <div class="card s7"><h3 data-c="chOffDelay"></h3><div class="sub"></div><div class="ch"><canvas id="chOffDelay"></canvas></div></div>
      <div class="card s5"><h3 data-c="chOnTime"></h3><div class="sub"></div><div class="ch"><canvas id="chOnTime"></canvas></div></div>
      <div class="card s4"><h3 data-c="chStatus"></h3><div class="sub"></div><div class="ch"><canvas id="chStatus"></canvas></div></div>
      <div class="card s12"><h3 data-c="chDelayTrucker"></h3><div class="sub"></div><div class="ch"><canvas id="chDelayTrucker"></canvas></div></div>

      <div class="card s6"><h3 data-c="chOper"></h3><div class="sub"></div><div class="ch"><canvas id="chOper"></canvas></div></div>
      <div class="card s6"><h3 data-c="chTruckerClient"></h3><div class="sub"></div><div class="ch"><canvas id="chTruckerClient"></canvas></div></div>
    </div>
  </div>
</main>

<aside id="fieldsPanel" style="display:none">
  <div class="f-head"><b id="fieldsTitle">Fields</b><span style="font-size:11px;color:var(--steel)" id="fieldsMeta"></span></div>
  <input class="f-search" id="fieldSearch">
  <div id="fieldGroups"></div>
</aside>
</div>

<div class="fpop" id="fpop"></div>

<div class="modal" id="hModal"><div class="box"><h2><span id="hTitleTxt"></span><button onclick="__FTL__.closeM('hModal')">×</button></h2>
  <input class="f-search" id="helpSearch" style="margin:12px 0 4px;width:100%"><div id="hBody"></div></div></div>
<div class="modal" id="qModal"><div class="box"><h2><span id="qTitleTxt"></span><button onclick="__FTL__.closeM('qModal')">×</button></h2><div id="qBody"></div></div></div>
<div class="modal" id="rModal"><div class="box wide"><h2><span id="rTitleTxt"></span><button onclick="__FTL__.closeM('rModal')">×</button></h2>
  <div class="xtabs" id="xtabs"></div>
  <div class="xmeta"><input class="search" id="rSearch" style="max-width:300px"><span id="rMeta"></span></div>
  <div class="xwrap"><table id="rTable"></table></div></div></div>
<div class="modal" id="xModal"><div class="box"><h2><span id="xTitleTxt"></span><button onclick="__FTL__.closeM('xModal')">×</button></h2>
  <p class="xhint" id="xHint"></p>
  <div class="xsec"><label class="xall"><input type="checkbox" id="xCover" checked> <b id="xCoverL"></b></label></div>
  <div class="xsec"><label class="xall"><input type="checkbox" id="xInsights" checked> <b id="xInsightsL"></b></label></div>
  <div class="xsec"><label class="xall"><input type="checkbox" id="xKpiAll" checked onchange="__FTL__.xToggleAll('kpi',this.checked)"> <b id="xKpiL"></b></label><div class="xgrid" id="xKpis"></div></div>
  <div class="xsec"><label class="xall"><input type="checkbox" id="xChAll" checked onchange="__FTL__.xToggleAll('ch',this.checked)"> <b id="xChL"></b></label><div class="xgrid" id="xCharts"></div></div>
  <div class="xfoot"><span id="xCount"></span><button class="hbtn" id="xMail" onclick="__FTL__.closeM('xModal');__FTL__.openMail('dash')" style="background:var(--mist);color:var(--ink)"></button><button class="hbtn primary xgo" id="xGo" onclick="__FTL__.runExport()"></button></div>
</div></div>
<div id="exportRoot"></div>
<div class="modal" id="dModal"><div class="box wide"><h2><span id="dTitleTxt"></span><button onclick="__FTL__.closeM('dModal')">×</button></h2>
  <div id="dBody"></div></div></div>
<div class="modal" id="mModal"><div class="box" style="max-width:760px"><h2><span id="mTitleTxt"></span><button onclick="__FTL__.closeM('mModal')">×</button></h2>
  <div id="mBody"></div>
  <div class="xfoot"><button class="hbtn primary xgo" id="mGo" onclick="__FTL__.sendMail()"></button></div></div></div>
<div class="modal" id="tripExportModal"><div class="box" style="max-width:760px"><h2><span id="tripExportTitle"></span><button onclick="__FTL__.closeM('tripExportModal')">×</button></h2><div id="tripExportBody"></div><div class="xfoot"><button class="hbtn primary" onclick="__FTL__.saveTripExport()" id="tripExportGo"></button></div></div></div>
<div class="modal" id="uModal"><div class="box" style="max-width:520px"><h2><span id="uTitleTxt"></span><button onclick="__FTL__.closeM('uModal')">×</button></h2><div id="uBody"></div></div></div>
<div class="modal" id="truckManifestModal">
  <div class="box manifest-box">
    <div class="manifest-header truck-theme">
      <div class="manifest-header-titles">
        <h3 id="truckManifestTitle">🚚 بيان حمولة الشاحنة والسائق (Truck Manifest)</h3>
        <span class="manifest-subtitle">كشف تفصيلي بالبضائع والطرود المحملة على هذه الشاحنة</span>
      </div>
      <div class="manifest-header-pills" id="truckManifestPills"></div>
      <button type="button" class="close-btn" onclick="__FTL__.closeM('truckManifestModal')" aria-label="Close">✕</button>
    </div>
    <div class="manifest-body" id="truckManifestBody"></div>
  </div>
</div>

<div class="modal" id="shipmentBreakdownModal">
  <div class="box manifest-box">
    <div class="manifest-header shipment-theme">
      <div class="manifest-header-titles">
        <h3 id="shipmentBreakdownTitle">📦 بيان وتوزيع الشحنة على السيارات (Shipment Distribution)</h3>
        <span class="manifest-subtitle">أين شحنتي؟ كشف توزيع طرود الشحنة على سيارات النقل والسائقين</span>
      </div>
      <div class="manifest-header-pills" id="shipmentBreakdownPills"></div>
      <button type="button" class="close-btn" onclick="__FTL__.closeM('shipmentBreakdownModal')" aria-label="Close">✕</button>
    </div>
    <div class="manifest-body" id="shipmentBreakdownBody"></div>
  </div>
</div>

<div class="modal" id="inactiveModal">
  <div class="box delivered-box inactive-box">
    <div class="delivered-title inactive-title">
      <h2 id="inactiveTitle">🗑️ الشحنات والعمليات غير النشطة (Inactive Archive)</h2>
      <button type="button" class="ebtn" onclick="__FTL__.closeM('inactiveModal')" aria-label="Close">✕</button>
    </div>
    <p id="inactiveCount"></p>
    <div class="delivered-tools">
      <button type="button" class="ebtn" id="inactiveSelectAll" onclick="__FTL__.toggleAllInactive()"></button>
      <button type="button" class="ebtn" id="inactiveCopy" onclick="__FTL__.copyInactiveTrips()" disabled></button>
    </div>
    <div class="triptools delivered-filters">
      <div class="tripsearch" id="inactiveSearch"></div>
      <span class="tripgrow"></span>
    </div>
    <div class="delivered-actions" id="inactiveActions">
      <label id="reopenInactiveLabel" for="reopenInactiveShipment"></label>
      <select id="reopenInactiveShipment"></select>
      <button type="button" class="ebtn" id="reopenInactiveAction" onclick="__FTL__.reopenSelectedInactive()"></button>
    </div>
    <div class="trip-page" id="inactivePage">
      <button type="button" id="inactivePrev" onclick="__FTL__.pageInactive(-1);__FTL__.renderInactive()">‹</button>
      <span id="inactivePageInfo"></span>
      <button type="button" id="inactiveNext" onclick="__FTL__.pageInactive(1);__FTL__.renderInactive()">›</button>
    </div>
    <div class="delivered-scroll">
      <table id="inactiveTable"><thead id="inactiveHead"></thead><tbody id="inactiveBody"></tbody></table>
    </div>
  </div>
</div>

<div class="toast" id="toast"></div>
`;
