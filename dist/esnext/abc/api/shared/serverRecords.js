import { List, Record } from "firemodel";
export async function serverRecords(context, pks, allPks) {
    const records = (await List.ids(context.model.constructor, ...pks)).data;
    const recordIds = records.map(i => Record.compositeKeyRef(context.model.constructor, i));
    const missing = pks.filter(i => !recordIds.includes(i));
    return {
        pks,
        allPks,
        missing,
        records,
        overallCachePerformance: context.cachePerformance,
        modelConfig: context.config
    };
}
