//+------------------------------------------------------------------+
//| TradeMindSync.mq5 — TradeMind AI auto-sync Expert Advisor        |
//|                                                                  |
//| Pushes account info, deals and open positions to the TradeMind   |
//| API over HTTP(S). Attach to any chart (one instance per account).|
//| The EA prints its live status in the top-left of the chart.      |
//|                                                                  |
//| SETUP (the TradeMind connect wizard pre-fills the inputs)        |
//|  1. MT5: Tools > Options > Expert Advisors >                     |
//|     "Allow WebRequest for listed URL" — add the ApiUrl below.    |
//|     NOTE: use http://127.0.0.1:4000 (not "localhost") for a      |
//|     local server — MT5 often fails to resolve localhost.         |
//|  2. Make sure the "Algo Trading" toolbar button is ON.           |
//+------------------------------------------------------------------+
#property copyright "TradeMind AI"
#property version   "1.10"
#property strict

input string ApiUrl              = "http://127.0.0.1:4000"; // TradeMind API base URL (no trailing slash)
input string SyncToken           = "";                      // Sync token from the TradeMind accounts page
input int    SyncIntervalSeconds = 15;                      // Deal sync cadence
input int    HeartbeatSeconds    = 30;                      // Balance/equity heartbeat cadence

long     g_lastDealTicket = 0;     // server-side cursor, set by handshake
bool     g_handshakeDone  = false;
datetime g_lastHeartbeat  = 0;
int      g_failStreak     = 0;     // consecutive request failures (for backoff)
datetime g_backoffUntil   = 0;
string   g_status         = "starting…";
datetime g_lastSyncOk     = 0;

//+------------------------------------------------------------------+
void SetStatus(const string text)
  {
   g_status = text;
   string synced = g_lastSyncOk > 0
      ? "\nlast sync: " + TimeToString(g_lastSyncOk, TIME_DATE | TIME_SECONDS)
      : "";
   Comment("TradeMind AI\n", g_status, synced);
  }

//+------------------------------------------------------------------+
int OnInit()
  {
   if(StringLen(SyncToken) < 8)
     {
      SetStatus("ERROR: SyncToken input is empty.\nDownload the pre-configured EA from the TradeMind accounts page,\nor paste the token into the EA inputs (F7).");
      Print("TradeMind: SyncToken input is empty — use the pre-configured download from the accounts page.");
      // Keep running so the message stays visible on the chart.
     }
   EventSetTimer(MathMax(5, SyncIntervalSeconds));
   SetStatus("connecting to " + ApiUrl + " …");
   TryHandshake();
   return(INIT_SUCCEEDED);
  }

void OnDeinit(const int reason)
  {
   EventKillTimer();
   Comment("");
  }

void OnTradeTransaction(const MqlTradeTransaction &trans,
                        const MqlTradeRequest &request,
                        const MqlTradeResult &result)
  {
   // no-op: the timer loop syncs everything; kept as a hook for instant sync later
  }

void OnTimer()
  {
   if(StringLen(SyncToken) < 8) return; // status already on chart
   if(TimeCurrent() < g_backoffUntil) return;
   if(!g_handshakeDone) { TryHandshake(); return; }

   if(TimeCurrent() - g_lastHeartbeat >= HeartbeatSeconds)
      if(SendHeartbeat())
         g_lastHeartbeat = TimeCurrent();

   SyncDeals();
  }

//+------------------------------------------------------------------+
//| HTTP                                                             |
//+------------------------------------------------------------------+
bool Post(const string path, const string body, string &response)
  {
   char data[];
   int len = StringToCharArray(body, data, 0, WHOLE_ARRAY, CP_UTF8) - 1; // drop trailing NUL
   if(len < 0) len = 0;
   ArrayResize(data, len);

   char result[];
   string resultHeaders;
   string headers = "Content-Type: application/json\r\nAuthorization: Bearer " + SyncToken + "\r\n";
   string url = ApiUrl + path;

   ResetLastError();
   int status = WebRequest("POST", url, headers, 10000, data, result, resultHeaders);
   if(status == -1)
     {
      int err = GetLastError();
      if(err == 4014)
        {
         SetStatus("BLOCKED: MT5 is not allowed to call\n" + ApiUrl +
                   "\nFix: Tools > Options > Expert Advisors >\ntick 'Allow WebRequest for listed URL' and add exactly:\n" + ApiUrl);
         Print("TradeMind: WebRequest not allowed (4014). Add ", ApiUrl,
               " under Tools > Options > Expert Advisors > Allow WebRequest.");
        }
      else
        {
         SetStatus("connection failed (error " + IntegerToString(err) + ") calling\n" + url +
                   "\nIs the TradeMind server running? If ApiUrl says 'localhost',\nuse http://127.0.0.1:4000 instead.");
         Print("TradeMind: WebRequest error ", err, " for ", url,
               " — check the server is running; prefer 127.0.0.1 over localhost.");
        }
      RegisterFailure();
      return(false);
     }
   response = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);
   if(status == 401)
     {
      SetStatus("REJECTED: this sync token is no longer valid.\nOpen TradeMind > MT5 accounts > Reconnect,\nand download a fresh pre-configured EA.");
      Print("TradeMind: HTTP 401 — token invalid/rotated. Reconnect from the web app and re-download the EA.");
      RegisterFailure();
      return(false);
     }
   if(status < 200 || status >= 300)
     {
      SetStatus("server error HTTP " + IntegerToString(status) + " from " + path + " — retrying…");
      Print("TradeMind: HTTP ", status, " from ", path, ": ", StringSubstr(response, 0, 200));
      RegisterFailure();
      return(false);
     }
   g_failStreak = 0;
   return(true);
  }

void RegisterFailure()
  {
   g_failStreak++;
   int delay = (int)MathMin(60, MathPow(2, MathMin(4, g_failStreak)) * 5); // 10s..60s
   g_backoffUntil = TimeCurrent() + delay;
  }

//+------------------------------------------------------------------+
//| JSON helpers                                                     |
//+------------------------------------------------------------------+
string JsonEscape(string s)
  {
   StringReplace(s, "\\", "\\\\");
   StringReplace(s, "\"", "\\\"");
   StringReplace(s, "\n", " ");
   StringReplace(s, "\r", " ");
   StringReplace(s, "\t", " ");
   return(s);
  }

string Num(const double v, const int digits = 8) { return(DoubleToString(v, digits)); }

// Extract an integer field like "lastDealTicket":123 from a JSON response.
long JsonGetLong(const string json, const string key)
  {
   int pos = StringFind(json, "\"" + key + "\"");
   if(pos < 0) return(-1);
   pos = StringFind(json, ":", pos);
   if(pos < 0) return(-1);
   pos++;
   while(pos < StringLen(json) && StringGetCharacter(json, pos) == ' ') pos++;
   string digits = "";
   while(pos < StringLen(json))
     {
      ushort c = StringGetCharacter(json, pos);
      if(c < '0' || c > '9') break;
      digits += ShortToString(c);
      pos++;
     }
   if(StringLen(digits) == 0) return(-1);
   return(StringToInteger(digits));
  }

//+------------------------------------------------------------------+
//| Handshake                                                        |
//+------------------------------------------------------------------+
void TryHandshake()
  {
   int offsetMin = (int)((TimeTradeServer() - TimeGMT()) / 60);
   string body = "{" +
      "\"accountNumber\":" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)) + "," +
      "\"broker\":\""      + JsonEscape(AccountInfoString(ACCOUNT_COMPANY)) + "\"," +
      "\"server\":\""      + JsonEscape(AccountInfoString(ACCOUNT_SERVER)) + "\"," +
      "\"currency\":\""    + JsonEscape(AccountInfoString(ACCOUNT_CURRENCY)) + "\"," +
      "\"leverage\":"      + IntegerToString(AccountInfoInteger(ACCOUNT_LEVERAGE)) + "," +
      "\"balance\":"       + Num(AccountInfoDouble(ACCOUNT_BALANCE), 2) + "," +
      "\"equity\":"        + Num(AccountInfoDouble(ACCOUNT_EQUITY), 2) + "," +
      "\"accountName\":\"" + JsonEscape(AccountInfoString(ACCOUNT_NAME)) + "\"," +
      "\"utcOffsetMinutes\":" + IntegerToString(offsetMin) +
      "}";

   string response;
   if(!Post("/sync/handshake", body, response)) return;

   long cursor = JsonGetLong(response, "lastDealTicket");
   if(cursor >= 0) g_lastDealTicket = cursor;
   g_handshakeDone = true;
   g_lastSyncOk = TimeCurrent();
   SetStatus("connected ✓  account #" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)) + " syncing");
   Print("TradeMind: connected. Resuming after deal ticket ", g_lastDealTicket);
  }

//+------------------------------------------------------------------+
//| Heartbeat                                                        |
//+------------------------------------------------------------------+
bool SendHeartbeat()
  {
   string body = "{" +
      "\"balance\":"    + Num(AccountInfoDouble(ACCOUNT_BALANCE), 2) + "," +
      "\"equity\":"     + Num(AccountInfoDouble(ACCOUNT_EQUITY), 2) + "," +
      "\"margin\":"     + Num(AccountInfoDouble(ACCOUNT_MARGIN), 2) + "," +
      "\"freeMargin\":" + Num(AccountInfoDouble(ACCOUNT_MARGIN_FREE), 2) + "," +
      "\"openPositions\":" + IntegerToString(PositionsTotal()) +
      "}";
   string response;
   if(!Post("/sync/heartbeat", body, response)) return(false);
   g_lastSyncOk = TimeCurrent();
   SetStatus("connected ✓  account #" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)) + " syncing");
   return(true);
  }

//+------------------------------------------------------------------+
//| Deals + open positions                                           |
//+------------------------------------------------------------------+
void SymbolMeta(const string symbol, int &digits, double &point)
  {
   digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
   point  = SymbolInfoDouble(symbol, SYMBOL_POINT);
   if(digits <= 0) digits = 5;
   if(point <= 0)  point = MathPow(10, -digits);
  }

string DealJson(const ulong ticket)
  {
   string symbol = HistoryDealGetString(ticket, DEAL_SYMBOL);
   long   type   = HistoryDealGetInteger(ticket, DEAL_TYPE);
   if(symbol == "" || (type != DEAL_TYPE_BUY && type != DEAL_TYPE_SELL))
      return("");                                          // skip balance/credit operations

   long entry = HistoryDealGetInteger(ticket, DEAL_ENTRY);
   string entryStr = entry == DEAL_ENTRY_IN     ? "in"
                   : entry == DEAL_ENTRY_OUT    ? "out"
                   : entry == DEAL_ENTRY_INOUT  ? "inout"
                   : "out_by";

   int digits; double point;
   SymbolMeta(symbol, digits, point);

   return "{" +
      "\"ticket\":"      + IntegerToString((long)ticket) + "," +
      "\"positionId\":"  + IntegerToString(HistoryDealGetInteger(ticket, DEAL_POSITION_ID)) + "," +
      "\"orderTicket\":" + IntegerToString(HistoryDealGetInteger(ticket, DEAL_ORDER)) + "," +
      "\"symbol\":\""    + JsonEscape(symbol) + "\"," +
      "\"type\":\""      + (type == DEAL_TYPE_BUY ? "buy" : "sell") + "\"," +
      "\"entry\":\""     + entryStr + "\"," +
      "\"volume\":"      + Num(HistoryDealGetDouble(ticket, DEAL_VOLUME), 2) + "," +
      "\"price\":"       + Num(HistoryDealGetDouble(ticket, DEAL_PRICE), digits) + "," +
      "\"sl\":"          + Num(HistoryDealGetDouble(ticket, DEAL_SL), digits) + "," +
      "\"tp\":"          + Num(HistoryDealGetDouble(ticket, DEAL_TP), digits) + "," +
      "\"commission\":"  + Num(HistoryDealGetDouble(ticket, DEAL_COMMISSION), 2) + "," +
      "\"swap\":"        + Num(HistoryDealGetDouble(ticket, DEAL_SWAP), 2) + "," +
      "\"profit\":"      + Num(HistoryDealGetDouble(ticket, DEAL_PROFIT), 2) + "," +
      "\"time\":"        + IntegerToString(HistoryDealGetInteger(ticket, DEAL_TIME)) + "," +
      "\"digits\":"      + IntegerToString(digits) + "," +
      "\"point\":"       + Num(point, 10) + "," +
      "\"magic\":"       + IntegerToString(HistoryDealGetInteger(ticket, DEAL_MAGIC)) +
      "}";
  }

string PositionJson(const int index)
  {
   if(PositionGetSymbol(index) == "") return("");
   string symbol = PositionGetString(POSITION_SYMBOL);
   int digits; double point;
   SymbolMeta(symbol, digits, point);
   return "{" +
      "\"positionId\":"   + IntegerToString(PositionGetInteger(POSITION_IDENTIFIER)) + "," +
      "\"symbol\":\""     + JsonEscape(symbol) + "\"," +
      "\"type\":\""       + (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY ? "buy" : "sell") + "\"," +
      "\"volume\":"       + Num(PositionGetDouble(POSITION_VOLUME), 2) + "," +
      "\"openPrice\":"    + Num(PositionGetDouble(POSITION_PRICE_OPEN), digits) + "," +
      "\"sl\":"           + Num(PositionGetDouble(POSITION_SL), digits) + "," +
      "\"tp\":"           + Num(PositionGetDouble(POSITION_TP), digits) + "," +
      "\"currentPrice\":" + Num(PositionGetDouble(POSITION_PRICE_CURRENT), digits) + "," +
      "\"profit\":"       + Num(PositionGetDouble(POSITION_PROFIT), 2) + "," +
      "\"swap\":"         + Num(PositionGetDouble(POSITION_SWAP), 2) + "," +
      "\"openTime\":"     + IntegerToString(PositionGetInteger(POSITION_TIME)) + "," +
      "\"digits\":"       + IntegerToString(digits) + "," +
      "\"point\":"        + Num(point, 10) +
      "}";
  }

void SyncDeals()
  {
   if(!HistorySelect(0, TimeCurrent() + 86400))
      return;

   string openJson = "";
   for(int i = 0; i < PositionsTotal(); i++)
     {
      string p = PositionJson(i);
      if(p == "") continue;
      if(openJson != "") openJson += ",";
      openJson += p;
     }

   const int BATCH = 200;
   long highestSent = g_lastDealTicket;
   string dealsJson = "";
   int batchCount = 0;
   int total = HistoryDealsTotal();

   for(int i = 0; i < total; i++)
     {
      ulong ticket = HistoryDealGetTicket(i);
      if((long)ticket <= g_lastDealTicket) continue;
      string d = DealJson(ticket);
      if((long)ticket > highestSent) highestSent = (long)ticket;
      if(d == "") continue;
      if(dealsJson != "") dealsJson += ",";
      dealsJson += d;
      batchCount++;
      if(batchCount >= BATCH)
        {
         if(!PostBatch(dealsJson, openJson)) return;   // resend from cursor next tick
         dealsJson = "";
         batchCount = 0;
        }
     }

   // Final batch — also sent when there are no new deals so the server keeps
   // floating P/L and SL/TP of open positions fresh.
   if(dealsJson != "" || openJson != "" || highestSent > g_lastDealTicket)
      if(!PostBatch(dealsJson, openJson)) return;

   g_lastDealTicket = MathMax(g_lastDealTicket, highestSent);
  }

bool PostBatch(const string dealsJson, const string openJson)
  {
   string body = "{\"deals\":[" + dealsJson + "],\"openPositions\":[" + openJson + "]}";
   string response;
   if(!Post("/sync/deals", body, response)) return(false);
   long cursor = JsonGetLong(response, "lastDealTicket");
   if(cursor > g_lastDealTicket) g_lastDealTicket = cursor;
   g_lastSyncOk = TimeCurrent();
   return(true);
  }
//+------------------------------------------------------------------+
