import { Model, Record, ICompositeKey } from "firemodel";
import { IAbcPostWatcher, IAbcResult } from "../../types";
import { AbcApi } from "./AbcApi";
import { arrayToHash, hashToArray } from "typed-conversions";
import { AbcError } from "../../errors";
import { IDictionary } from "common-types";

/**
 * Whenever the `api.get()` or `api.load()` calls return they will
 * respond with this class. The classes goal is to pass back not only
 * the result but also certain meta data and a simple means to conditionally
 * watch certain elements of the returned resultset.
 */
export class AbcResult<T extends Model> {
  constructor(private _context: AbcApi<T>, private _results: IAbcResult<T>, private _performance?: IDictionary) {}

  static async create<T extends Model>(_context: AbcApi<T>, _results: IAbcResult<T>, _performance?: IDictionary) {
    const obj = new AbcResult(_context, _results, _performance);
    if (obj.serverRecords === undefined) {
      obj.records = obj.localRecords;
      return obj;
    }
    
    // Models with dynamic paths
    const hasDynamicProperties = Record.dynamicPathProperties(obj._context.model.constructor).length > 0;
    if (hasDynamicProperties) {
      let localPathProps = Record.compositeKey(obj._context.model.constructor, obj.serverRecords[0]);
      delete localPathProps.id;
      // const where = Object.keys(localPathProps).reduce((agg, curr: keyof ICompositeKey<T> & string) => {
      //   const value = typeof localPathProps[curr] === 'string' ? `"${localPathProps[curr]}"` : localPathProps[curr]
      //   agg[curr].push(value);
      //   return agg;
      // }, {} as IDictionary);
      console.log(obj._context.dexieModels, Object.keys(localPathProps), Object.values(localPathProps));
      const queryResults = await obj._context.dexieTable.where(Object.keys(localPathProps))
        .notEqual(Object.values(localPathProps)).toArray()
      const localOffDynamicPath = arrayToHash(queryResults)

      const server = arrayToHash(obj.serverRecords || []);
      obj.records = hashToArray({ ...localOffDynamicPath, ...server });
    } else {
      obj.records = obj.serverRecords !== undefined
        ? obj.serverRecords
        : obj.localRecords;
    }

    return obj;
  }

  /**
   * All of the updated records in Vuex that originated from either IndexedDB or Firebase
   */
  records: T[] = []

  /**
   * All of the updated records in Vuex that originated from IndexedDB
   */
  get localRecords(): T[] {
    return this._results.local?.records || [];
  }

  /**
   * All of the updated records in Vuex that originated from Firebase
   */
  get serverRecords(): T[] | undefined {
    return this._results.server ? this._results.server.records : undefined;
  }

  get cachePerformance() {
    return this._context.cachePerformance;
  }

  get requestPerformance() {
    return this._performance;
  }

  get vuex() {
    return this._context.vuex;
  }

  /**
   * The options passed in for the specific request which led to this result
   */
  get options() {
    return this._results.options;
  }

  /** the query definition used to arrive at these results */
  get queryDefn() {
    if (this._results.type !== "query") {
      throw new AbcError(
        `The attempt to reference the result's "queryDefn" is invalid in non-query based results!`,
        "not-allowed"
      );
    }

    return this._results.queryDefn;
  }

  /**
   * Runs a callback which filters down the set of results
   * which should be watched. This list is then filtered down
   * to just those which do not currently have a watcher on them.
   *
   * @param fn the callback function to call
   */
  watch(fn: IAbcPostWatcher<T>) {
    // const watcherIds = fn(this.results);
  }
}
