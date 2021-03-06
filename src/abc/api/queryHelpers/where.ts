import { AbcRequestCommand, QueryType, IAbcQueryHelper } from "../../../types";
import { AbcApi } from "../AbcApi";
import {
  getStore,
  AbcResult,
  IQueryOptions,
  IAbcWhereQueryDefinition
} from "../../..";
import { List, Model, PropType, IComparisonOperator } from "firemodel";
import { generalizedQuery } from "../shared";

/**
 * Offers a configuration to consumers of the standard _where_ clause that Firebase
 * provides and then provides an implementation that is aligned with the ABC `get`
 * and `load` endpoints.
 */
export const where: IAbcQueryHelper = function where<T extends Model, K extends keyof T>(
  defn:
    | IAbcWhereQueryDefinition<T>
    | (IAbcWhereQueryDefinition<T> & { queryType: QueryType.where }),
) {
  defn = { ...defn, queryType: QueryType.where };
  return async (command, ctx: AbcApi<T>, options: IQueryOptions<T> = {}) => {
    // The value and operation to be used
    const valueOp: PropType<T, K> | [IComparisonOperator, PropType<T, K>] =
      defn.equals !== undefined
        ? defn.equals
        : defn.greaterThan !== undefined
        ? [">", defn.greaterThan]
        : ["<", defn.lessThan];
    // The query to use for IndexedDB
    const dexieQuery = async () => {
      const recs = await ctx.dexieList.where(defn.property, valueOp);

      return recs;
    };
    // The query to use for Firebase
    const firemodelQuery = async () => {
      const list = await List.where(
        ctx.model.constructor,
        defn.property,
        valueOp,
        options || {}
      );
      return list.data;
    };

    return generalizedQuery(
      defn,
      command,
      dexieQuery,
      firemodelQuery,
      ctx,
      options
    );
  };
};

where.prototype.isQueryHelper = true;
