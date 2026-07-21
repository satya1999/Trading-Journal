/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accounts from "../accounts.js";
import type * as accountsActions from "../accountsActions.js";
import type * as analytics from "../analytics.js";
import type * as auth from "../auth.js";
import type * as authActions from "../authActions.js";
import type * as breakdown from "../breakdown.js";
import type * as chat from "../chat.js";
import type * as crypto from "../crypto.js";
import type * as http from "../http.js";
import type * as metrics from "../metrics.js";
import type * as sync from "../sync.js";
import type * as trades from "../trades.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accounts: typeof accounts;
  accountsActions: typeof accountsActions;
  analytics: typeof analytics;
  auth: typeof auth;
  authActions: typeof authActions;
  breakdown: typeof breakdown;
  chat: typeof chat;
  crypto: typeof crypto;
  http: typeof http;
  metrics: typeof metrics;
  sync: typeof sync;
  trades: typeof trades;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
