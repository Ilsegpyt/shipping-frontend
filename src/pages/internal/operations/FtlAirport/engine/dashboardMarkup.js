import { LOGO_SRC } from '../assets/logo.js';

export const getDashboardMarkup = () => `
<header>
  <svg id="waves" viewBox="0 0 1200 26" preserveAspectRatio="none"><path d="M0 21 H1200 V26 H0 Z" fill="#bff0f7" opacity=".85"/><path d="M0 13 H1200" stroke="#dff4f8" stroke-width="2.2" stroke-dasharray="30 24" opacity=".7"/></svg>
  <div class="logo"><img id="logoImg" src="${LOGO_SRC}" alt="ILS Egypt"></div>
  <div class="vdiv"></div>
  <div>
    <div class="h-kicker">
      <svg class="glyph" viewBox="0 0 36 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M2 13l11-2 6-8h3l-3 8 10-1 4-3h2l-2 5 2 5h-2l-4-3-10-1 3 8h-3l-6-8-11-2z"/>
      </svg>
      <span id="hKicker">ILS EGYPT · FTL AIRPORT</span>
    </div>
    <div class="h-title disp" id="hTitle">FTL Airport Dashboard</div>
    <div class="h-sub" id="hSub">Air shipments · Import & Export · Operations</div>
  </div>
  <div class="spacer"></div>
  <span class="tag" id="dataTag">Loading data...</span>
  <button class="hbtn" id="refreshBtn" onclick="__FTL_DASH__.reload()" title="Refresh live data">↻ Refresh</button>
  <button class="hbtn" id="exportBtn" onclick="__FTL_DASH__.openExport()">Export Dashboard</button>
  <button class="hbtn" id="helpBtn" onclick="__FTL_DASH__.openHelp()">Help</button>
  <button class="hbtn" id="langBtn" onclick="__FTL_DASH__.toggleLang()">عربي</button>
  <button class="hbtn" id="themeBtn" onclick="__FTL_DASH__.toggleTheme()" aria-label="Theme">🌙</button>
</header>

<div class="wrap">
<main>
  <div id="dash">
    <div class="dtabs" id="dirTabs">
      <button class="dtab on" data-dir="Import" id="dtImp"><span class="ico">↓</span><span class="lbl">Import</span><span class="cnt">0</span></button>
      <button class="dtab" data-dir="Export" id="dtExp"><span class="ico">↑</span><span class="lbl">Export</span><span class="cnt">0</span></button>
      <button class="dtab" data-dir="" id="dtAll"><span class="ico">⇄</span><span class="lbl">Overview</span><span class="cnt">0</span></button>
    </div>
    <select id="fDir" style="display:none">
      <option value="Import">Import</option>
      <option value="Export">Export</option>
      <option value="">Overview</option>
    </select>

    <div class="rail">
      <div class="rrow">
        <div class="fld"><label for="dateBasis" id="lBasis">Date basis</label>
          <select id="dateBasis">
            <option value="load">Offloading date</option>
            <option value="reqDate">Required offloading</option>
            <option value="arrDate">Actual arrival</option>
            <option value="gateIn">Gate in</option>
            <option value="gateOut">Gate out</option>
            <option value="free">Free-time end</option>
          </select>
        </div>
        <div class="fld"><label for="dFrom" id="lFrom">From</label><input type="date" id="dFrom"></div>
        <div class="fld"><label for="dTo" id="lTo">To</label><input type="date" id="dTo"></div>
        <div class="fld"><label id="lQuick">Quick range</label>
          <div class="presets">
            <button class="chip" data-preset="30">Last 30 days</button>
            <button class="chip" data-preset="90">Last 90 days</button>
            <button class="chip on" data-preset="all">All time</button>
          </div>
        </div>
        <div class="fld"><label for="cFrom" id="lCreatedFrom">Created from</label><input type="date" id="cFrom"></div>
        <div class="fld"><label for="cTo" id="lCreatedTo">Created to</label><input type="date" id="cTo"></div>
        <div class="fld"><label id="deliveryFilterLabel" for="deliveryFilter">Delivery</label>
          <select id="deliveryFilter">
            <option value="All">All shipments</option>
            <option value="Open">Open</option>
            <option value="Delivered">Delivered</option>
          </select>
        </div>
        <button class="reset" id="resetBtn" onclick="__FTL_DASH__.resetFilters()">Clear filters</button>
      </div>
      <div class="rsep"></div>
      <div class="rrow">
        <div class="fld"><label for="fClient" id="lClient">Client</label><select id="fClient"><option value="">All clients</option></select></div>
        <div class="fld"><label for="fTrucker" id="lTrucker">Trucker</label><select id="fTrucker"><option value="">All truckers</option></select></div>
        <div class="fld"><label for="fDest" id="lDest">Site</label><select id="fDest"><option value="">All sites</option></select></div>
        <div class="fld"><label for="fOper" id="lOper">Operations staff</label><select id="fOper"><option value="">Everyone</option></select></div>
        <div class="fld"><label for="fLine" id="lLine">Terminal / Airline</label><select id="fLine"><option value="">All lines</option></select></div>
        <div class="fld" id="fldPort"><label for="fPort" id="lPort">Port / Airport</label><select id="fPort"><option value="">All ports</option></select></div>
        <div class="fld" id="fldFrom" style="display:none"><label for="fFrom" id="lFrom2">FROM</label><select id="fFrom"><option value="">All</option></select></div>
        <div class="fld" id="fldTo" style="display:none"><label for="fTo" id="lTo2">TO</label><select id="fTo"><option value="">All</option></select></div>
        <div class="fld" id="fldRisk"><label for="fRisk" id="lRisk">Demurrage</label><select id="fRisk"><option value="">All trips</option></select></div>
      </div>
    </div>
    <div id="activeNote"></div>

    <div class="kpis">
      <div class="kpi" id="kpiTrips"><div class="k-top"><span class="k-ico">🚛</span><span class="k-label" id="lTrips">Trips</span></div><div class="k-val" id="kTrips">–</div><div class="k-sub" id="kTripsSub"></div><div class="spark" id="sTrips"></div></div>
      <div class="kpi aqua" id="kpiCont"><div class="k-top"><span class="k-ico">📦</span><span class="k-label" id="lCont">Packages</span></div><div class="k-val" id="kCont">–</div><div class="k-sub" id="kContSub"></div><div class="spark" id="sCont"></div></div>
      <div class="kpi" id="kpiClients"><div class="k-top"><span class="k-ico">🏭</span><span class="k-label" id="lClients">Clients</span></div><div class="k-val" id="kClients">–</div><div class="k-sub" id="kClientsSub"></div></div>
      <div class="kpi sand" id="kpiTruckers"><div class="k-top"><span class="k-ico">🤝</span><span class="k-label" id="lTruckers">Truckers</span></div><div class="k-val" id="kTruckers">–</div><div class="k-sub" id="kTruckersSub"></div></div>
      <div class="kpi bad" id="kpiRisk"><div class="k-top"><span class="k-ico">⚠️</span><span class="k-label" id="lRiskK">Late Arrival</span></div><div class="k-val" id="kRisk">–</div><div class="k-sub" id="kRiskSub"></div></div>
      <div class="kpi good" id="kpiFree"><div class="k-top"><span class="k-ico">🕓</span><span class="k-label" id="lFree">Free Time</span></div><div class="k-val" id="kFree">–</div><div class="k-sub" id="kFreeSub"></div></div>
      <div class="kpi" id="kpiOper"><div class="k-top"><span class="k-ico">👥</span><span class="k-label" id="lOperK">Operations</span></div><div class="k-val" id="kOper">–</div><div class="k-sub" id="kOperSub"></div></div>
      <div class="kpi warn" id="kpiTrucks"><div class="k-top"><span class="k-ico">🚚</span><span class="k-label" id="lTrucks">Trucks</span></div><div class="k-val" id="kTrucks">–</div><div class="k-sub" id="kTrucksSub"></div></div>
      <div class="kpi good" id="kpiCut"><div class="k-top"><span class="k-ico">⏰</span><span class="k-label" id="lCut">Cut-off buffer</span></div><div class="k-val" id="kCut">–</div><div class="k-sub" id="kCutSub"></div></div>
      <div class="kpi" id="kpiShip"><div class="k-top"><span class="k-ico">📄</span><span class="k-label" id="lShip">Shipments</span></div><div class="k-val" id="kShip">–</div><div class="k-sub" id="kShipSub"></div></div>
      <div class="kpi good" id="kpiOnTime"><div class="k-top"><span class="k-ico">🎯</span><span class="k-label" id="lOnTime">On time</span></div><div class="k-val" id="kOnTime">–</div><div class="k-sub" id="kOnTimeSub"></div></div>
      <div class="kpi bad" id="kpiOffDelay"><div class="k-top"><span class="k-ico">⏱️</span><span class="k-label" id="lOffDelay">Offloading delay</span></div><div class="k-val" id="kOffDelay">–</div><div class="k-sub" id="kOffDelaySub"></div></div>
      <div class="kpi" id="kpiTransit"><div class="k-top"><span class="k-ico">🛣️</span><span class="k-label" id="lTransit">Transit time</span></div><div class="k-val" id="kTransit">–</div><div class="k-sub" id="kTransitSub"></div></div>
      <div class="kpi aqua" id="kpiDestU"><div class="k-top"><span class="k-ico">📍</span><span class="k-label" id="lDestU">Destinations</span></div><div class="k-val" id="kDestU">–</div><div class="k-sub" id="kDestUSub"></div></div>
      <div class="kpi" id="kpiPortU"><div class="k-top"><span class="k-ico">⚓</span><span class="k-label" id="lPortU">Terminals</span></div><div class="k-val" id="kPortU">–</div><div class="k-sub" id="kPortUSub"></div></div>
      <div class="kpi aqua" id="kpiRoute"><div class="k-top"><span class="k-ico">🛣️</span><span class="k-label" id="lRoute">Routes</span></div><div class="k-val" id="kRoute">–</div><div class="k-sub" id="kRouteSub"></div></div>
    </div>

    <div class="card insights" id="insCard"><h3 id="insH">Key observations</h3><div class="sub" id="insSub"></div><ul id="insightList"></ul></div>

    <div class="grid">
      <div class="card s8"><h3 data-c="chMonthly">Trips by month</h3><div class="sub"></div><div class="ch"><canvas id="chMonthly"></canvas></div></div>
      <div class="card s4"><h3 data-c="chDir">Direction</h3><div class="sub"></div><div class="ch"><canvas id="chDir"></canvas></div></div>

      <div class="card s12"><h3 data-c="chDaily">Daily pattern</h3><div class="sub"></div><div class="ch"><canvas id="chDaily"></canvas></div></div>

      <div class="card s6"><h3 data-c="chClient">Top clients</h3><div class="sub"></div><div class="ch"><canvas id="chClient"></canvas></div></div>
      <div class="card s6"><h3 data-c="chTrucker">Transporters</h3><div class="sub"></div><div class="ch"><canvas id="chTrucker"></canvas></div></div>

      <div class="card s7"><h3 data-c="chRiskClient">Demurrage / Late risk by client</h3><div class="sub"></div><div class="ch"><canvas id="chRiskClient"></canvas></div></div>
      <div class="card s5"><h3 data-c="chFree">Free-time usage</h3><div class="sub"></div><div class="ch"><canvas id="chFree"></canvas></div></div>

      <div class="card s5"><h3 data-c="chDest">Delivery sites</h3><div class="sub"></div><div class="ch"><canvas id="chDest"></canvas></div></div>
      <div class="card s4"><h3 data-c="chLine">Terminals / Airlines</h3><div class="sub"></div><div class="ch"><canvas id="chLine"></canvas></div></div>
      <div class="card s6"><h3 data-c="chPort">Destination airports / Ports</h3><div class="sub"></div><div class="ch"><canvas id="chPort"></canvas></div></div>
      <div class="card s6"><h3 data-c="chRoute">Routes</h3><div class="sub"></div><div class="ch"><canvas id="chRoute"></canvas></div></div>
      <div class="card s7"><h3 data-c="chOffDelay">Required vs actual offloading</h3><div class="sub"></div><div class="ch"><canvas id="chOffDelay"></canvas></div></div>
      <div class="card s5"><h3 data-c="chOnTime">Arrived on time</h3><div class="sub"></div><div class="ch"><canvas id="chOnTime"></canvas></div></div>
      <div class="card s4"><h3 data-c="chStatus">Status</h3><div class="sub"></div><div class="ch"><canvas id="chStatus"></canvas></div></div>
      <div class="card s12"><h3 data-c="chDelayTrucker">Delay share per transporter</h3><div class="sub"></div><div class="ch"><canvas id="chDelayTrucker"></canvas></div></div>

      <div class="card s6"><h3 data-c="chOper">Operations staff workload</h3><div class="sub"></div><div class="ch"><canvas id="chOper"></canvas></div></div>
      <div class="card s6"><h3 data-c="chTruckerClient">Transporter client coverage</h3><div class="sub"></div><div class="ch"><canvas id="chTruckerClient"></canvas></div></div>
    </div>
  </div>
</main>
</div>

<div class="modal" id="hModal">
  <div class="box">
    <h2><span id="hTitleTxt">Dashboard Help</span><button type="button" onclick="__FTL_DASH__.closeM('hModal')">×</button></h2>
    <input class="f-search" id="helpSearch" placeholder="Search topics..." style="margin:12px 0 4px;width:100%">
    <div id="hBody"></div>
  </div>
</div>

<div class="modal" id="xModal">
  <div class="box">
    <h2><span id="xTitleTxt">Export Dashboard</span><button type="button" onclick="__FTL_DASH__.closeM('xModal')">×</button></h2>
    <p class="xhint" id="xHint"></p>
    <div class="xsec"><label class="xall"><input type="checkbox" id="xCover" checked> <b id="xCoverL">Cover page</b></label></div>
    <div class="xsec"><label class="xall"><input type="checkbox" id="xInsights" checked> <b id="xInsightsL">Key observations</b></label></div>
    <div class="xsec"><label class="xall"><input type="checkbox" id="xKpiAll" checked onchange="__FTL_DASH__.xToggleAll('kpi',this.checked)"> <b id="xKpiL">KPI metrics</b></label><div class="xgrid" id="xKpis"></div></div>
    <div class="xsec"><label class="xall"><input type="checkbox" id="xChAll" checked onchange="__FTL_DASH__.xToggleAll('ch',this.checked)"> <b id="xChL">Charts</b></label><div class="xgrid" id="xCharts"></div></div>
    <div class="xfoot">
      <span id="xCount"></span>
      <button class="hbtn primary xgo" id="xGo" onclick="__FTL_DASH__.runExport()">Print / Save PDF</button>
    </div>
  </div>
</div>

<div id="exportRoot"></div>
<div class="toast" id="toast"></div>
`;
