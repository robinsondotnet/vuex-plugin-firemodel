import { IDictionary } from "common-types";
import { IFmWatchEvent } from "firemodel";

/**
 * Detects whether the change is a `Record` or a `List` and ensures
 * that the **state** parameter is typed correctly as well as passing
 * back a boolean flag at runtime.
 */
export function isRecord<T>(
  state: T | IDictionary<T[]>,
  payload: IFmWatchEvent<any>
): state is T {
  return payload.watcherSource === "record";
}
