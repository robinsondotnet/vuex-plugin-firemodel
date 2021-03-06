import { Record, FireModel, DexieDb } from "firemodel";
import { isDiscreteRequest, AbcMutation, AbcStrategy } from "../../types/abc";
import { getDefaultApiConfig } from "../configuration/configApi";
import { capitalize } from "../../shared";
import { AbcError } from "../../errors/index";
import { AbcResult } from "./AbcResult";
import { pathJoin } from "common-types";
import { getFromVuex, getFromIndexedDb, getFromFirebase, mergeLocalRecords, saveToIndexedDb } from "./api-parts/getDiscrete/index";
import { getStore } from "../..";
/**
 * Provides the full **ABC** API, including `get`, `load`, and `watch` but also
 * including meta-data properties too.
 */
export class AbcApi {
    constructor(model, config = {}) {
        // CACHE STATS
        this._cacheHits = 0;
        this._cacheMisses = 0;
        this._cacheIgnores = 0;
        // if (!config.db && FireModel.defaultDb) {
        //   throw new AbcError(`You must provide a way to access the database before you instantiate the ABC API! You can pass it in explicitly as a part of the config or it will pickup the FireModel.defaultDb if that's available.`, 'not-ready')
        // }
        this._modelConstructor = model;
        this._config = Object.assign(Object.assign({}, getDefaultApiConfig()), config);
        const rec = Record.create(this._modelConstructor);
        this._dynamicPathComponents = rec.hasDynamicPath
            ? rec.dynamicPathComponents
            : false;
        this._dbOffset = rec.dbOffset;
        this._modelName = {
            singular: rec.modelName,
            plural: rec.pluralName,
            pascal: capitalize(rec.modelName)
        };
        this._modelMeta = rec.META;
        AbcApi.addModel(this);
    }
    /**
     * Boolean flag which indicates whether the IndexedDB is connected
     * for use with the **ABC** API.
     */
    static get indexedDbConnected() {
        return AbcApi._dexieDb && AbcApi._dexieDb.isOpen() ? true : false;
    }
    /**
     * Adds a model to the managed models dictionary that AbcApi manages.
     */
    static addModel(model) {
        const modelName = model.about.model.pascal;
        if (AbcApi._modelsManaged[modelName]) {
            throw new AbcError(`You have attempted to register the model ${modelName} twice!`, `abc-api/invalid-model-registration`);
        }
        AbcApi._modelsManaged[modelName] = model;
        return model;
    }
    /**
     * Returns a list of `Model`'s that have been configured
     * for use with the **ABC** API.
     */
    static get configuredFiremodelModels() {
        return Object.keys(AbcApi._modelsManaged);
    }
    /**
     * Returns constructors for the `Model`s which will be managed by the IndexedDB
     */
    static get indexedDbModelConstructors() {
        return Object.keys(AbcApi._modelsManaged)
            .filter(m => AbcApi._modelsManaged[m].config.useIndexedDb)
            .map(m => AbcApi._modelsManaged[m]._modelConstructor);
    }
    /**
     * returns an `AbcApi` instance for a given `Model`
     */
    static getModelApi(model) {
        const r = Record.create(model);
        const name = capitalize(r.modelName);
        if (!AbcApi._modelsManaged[name]) {
            throw new AbcError(`You attempted to get an AbcApi for the model ${name} but it is not yet configured!`, "abc-api/invalid-model");
        }
        return AbcApi._modelsManaged[name];
    }
    /**
     * Clears the **ABC** API from all models that are being managed and disconnects for IndexedDB
     */
    static async clear() {
        const waitFor = [];
        Object.keys(AbcApi._modelsManaged).forEach(key => {
            const ref = AbcApi.getModelApi(AbcApi._modelsManaged[key].model.constructor);
            if (ref.config.useIndexedDb) {
                waitFor.push(ref.dexieTable.clear());
            }
        });
        await Promise.all(waitFor).catch(e => {
            console.warn(e);
        });
        AbcApi._modelsManaged = {};
        if (AbcApi.indexedDbConnected) {
            AbcApi.disconnect();
        }
    }
    static disconnect() {
        return AbcApi._dexieDb.close();
    }
    /**
     * Connects to the IndexedDB; using all the models the ABC API knows
     * about (and which have been configured to use IndexedDB)
     */
    static async connectIndexedDb() {
        const models = AbcApi.indexedDbModelConstructors;
        if (models.length > 0) {
            AbcApi._dexieDb = new DexieDb(`ABC-API`, ...models);
            if (!AbcApi._dexieDb.isOpen()) {
                await AbcApi._dexieDb.open();
            }
        }
        else {
            console.info("ABC API has no models using IndexedDB");
        }
    }
    cacheHits(hits) {
        this._cacheHits += hits;
    }
    cacheMisses(misses) {
        this._cacheMisses += misses;
    }
    /**
     * Different naming conventions for the model along with the model's
     * constructor
     */
    get model() {
        return Object.assign(Object.assign({}, this._modelName), { constructor: this._modelConstructor });
    }
    /**
     * Everything you wanted to know about this instance of the **ABC** API
     * but were afraid to ask. :)
     */
    get about() {
        return {
            /**
             * Different naming conventions for the model along with the model's
             * constructor
             */
            model: this.model,
            /** The meta infomation associated with the `Model` */
            modelMeta: this._modelMeta,
            /** the ABC API's configuration */
            config: this._config,
            dbOffset: this._dbOffset,
            dynamicPathComponents: this._dynamicPathComponents
        };
    }
    /**
     * Information about the Vuex location
     */
    get vuex() {
        return {
            /**
             * Indicates whether this module has been configured as a _list_
             * or a _record_.
             */
            isList: this.config.isList,
            /**
             * Path to the root of the module
             */
            modulePath: this.config.isList ? this.model.plural : this.model.singular,
            /**
             * The name of the Vuex module who's state
             * is being queried
             */
            moduleName: (this.config.moduleName || this.config.isList
                ? this.about.model.plural
                : this.about.modelMeta.localModelName),
            /**
             * An optional offset to the module to store record(s)
             */
            modulePostfix: this.config.isList
                ? this._modelMeta.localPostfix || "all"
                : "",
            /**
             * The full path to where the record(s) reside
             */
            fullPath: this.config.isList
                ? pathJoin(this.model.plural, this._modelMeta.localPostfix || "all")
                : this.model.singular
        };
    }
    /**
     * Look at the performance of caching of your data for
     * the given `Model`
     */
    get cachePerformance() {
        return {
            /** results found in IndexedDB */
            hits: this._cacheHits,
            /** had to go to Firebase for results */
            misses: this._cacheMisses,
            /** ignored the request as results were already in Vuex */
            ignores: this._cacheIgnores
        };
    }
    /**
     * Get records using the **ABC** API.
     *
     * @request either a Query Helper (since, where, etc.) or an array of primary keys
     */
    async get(request, options = {}) {
        if (isDiscreteRequest(request)) {
            return this.getDiscrete(request, options);
        }
        else {
            return request("get", this, options);
        }
    }
    /**
     * Handles GET requests for Discrete ID requests
     */
    async getDiscrete(request, options = {}) {
        const store = getStore();
        // const t0 = performance.now();
        let idxRecords = [];
        const requestIds = request.map(i => Record.compositeKeyRef(this._modelConstructor, i));
        // get from Vuex
        const vuexRecords = await getFromVuex(this);
        if (this.config.useIndexedDb) {
            // get from indexedDB
            idxRecords = await getFromIndexedDb(this.dexieRecord, requestIds);
        }
        const local = mergeLocalRecords(this, idxRecords, vuexRecords, requestIds);
        const localResult = await AbcResult.create(this, {
            type: 'discrete',
            local,
            options
        }, {});
        // no records found
        let server = undefined;
        if (!(local === null || local === void 0 ? void 0 : local.records)) {
            // get from firebase
            const { server, serverResults } = await getFromFirebase(this, local, options, requestIds);
            // cache results to IndexedDB
            if (this.config.useIndexedDb) {
                // save to indexedDB
                saveToIndexedDb(server, this.dexieTable);
            }
            store.commit(`${this.vuex.moduleName}/${AbcMutation.ABC_FIREBASE_REFRESH_INDEXED_DB}`, serverResults);
        }
        else {
            store.commit(`${this.vuex.moduleName}/${AbcMutation.ABC_VUEX_UPDATE_FROM_IDX}`, localResult);
        }
        // const perfOverall = t2 - t0;
        const results = await AbcResult.create(this, {
            type: "discrete",
            options,
            local,
            server
        }, { /* perfOverall, perfLocal, perfServer */});
        return results;
    }
    /**
     * Handles LOAD requests for Discrete ID requests
     */
    async loadDiscrete(request, options = {}) {
        // const t0 = performance.now();
        const requestIds = request.map(i => Record.compositeKeyRef(this._modelConstructor, i));
        const local = undefined;
        const { server, serverResults } = await getFromFirebase(this, local, options, requestIds);
        // cache results to IndexedDB
        if (this.config.useIndexedDb) {
            // save to indexedDB
            await saveToIndexedDb(server, this.dexieTable);
        }
        if (options.strategy === AbcStrategy.loadVuex) {
            const store = getStore();
            // load data into vuex
            store.commit(`${this.vuex.moduleName}/${AbcMutation.ABC_FIREBASE_TO_VUEX_UPDATE}`, serverResults);
        }
        // const perfOverall = t2 - t0;
        const results = await AbcResult.create(this, {
            type: "discrete",
            options,
            local,
            server
        }, { /* perfOverall, perfLocal, perfServer */});
        return results;
    }
    /**
     * Provides access to the Firebase database
     */
    get db() {
        const db = this.config.db || FireModel.defaultDb;
        if (!db) {
            throw new AbcError(`Attempt to access the database via the db getter failed which means that the ABC API was not given a database connector and there is no "defaultDb" set with Firemodel.`);
        }
        return db;
    }
    /**
     * The **ABC** configuration for this instance's `Model`
     */
    get config() {
        return this._config;
    }
    get dexieModels() {
        return this.dexie.dexieTables;
    }
    /**
     * Provides access to this Dexie **Table API**
     */
    get dexieTable() {
        return this.dexie.table(this._modelConstructor);
    }
    /**
     * Provides access to this Dexie **Record API**
     */
    get dexieRecord() {
        return this.dexie.record(this._modelConstructor);
    }
    /**
     * Provides access to this Dexie **List API**
     */
    get dexieList() {
        return this.dexie.list(this._modelConstructor);
    }
    get dexie() {
        if (!this.about.config.useIndexedDb) {
            throw new AbcError(`You are attempting to access Dexie while connected to the ABC API with the model ${this.about.model.pascal} which is configured NOT to use IndexedDB!`, "not-allowed");
        }
        if (!AbcApi._dexieDb) {
            throw new AbcError(`The Dexie database is not yet connected; calls to get() or load() will automatically connect it but if you want to access it prior to that you must call connectDexie()`, "not-ready");
        }
        return AbcApi._dexieDb;
    }
    /**
     * Connects Dexie to IndexedDB for _all_ Firemodel Models
     */
    async connectDexie() {
        return AbcApi.connectIndexedDb();
    }
    /**
     * Load records using the **ABC** API
     *
     * @request either a Query Helper (since, where, etc.) or an array of primary keys
     */
    async load(request, options = {}) {
        if (isDiscreteRequest(request)) {
            return this.loadDiscrete(request, options);
        }
        else {
            return request("load", this, options);
        }
    }
    /**
     * Watch records using the **ABC** API
     */
    async watch() {
        return [];
    }
    toJSON() {
        return {
            model: this.about.model.pascal,
            config: this.about.config,
            cachePerformance: this.cachePerformance
        };
    }
    toString() {
        return `ABC API for the "${this.about.model.pascal}" model [ cache: ${this.cachePerformance.hits}/${this.cachePerformance.misses} ]`;
    }
}
/**
 * keeps tabs on all of the `Model`'s which have been configured
 * for the **ABC** API.
 */
AbcApi._modelsManaged = {};
