"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
const store_1 = require("./store");
const firemodel_1 = require("firemodel");
const abstracted_client_1 = require("abstracted-client");
const common_types_1 = require("common-types");
const FmConfigActions_1 = require("./types/actions/FmConfigActions");
const FiremodelPluginError_1 = require("./errors/FiremodelPluginError");
const addNamespace_1 = require("./shared/addNamespace");
__export(require("./firemodelMutations/index"));
let _db;
let _auth;
async function getDb(config) {
    if (!exports.dbConfig) {
        throw common_types_1.createError("firemodel-plugin/no-configuration", `Attempt to instantiate the database without db configuration provided!`);
    }
    if (!_db) {
        setDb(await abstracted_client_1.DB.connect(exports.dbConfig));
    }
    return _db;
}
exports.getDb = getDb;
function setDb(db) {
    db = _db;
}
exports.setDb = setDb;
async function getAuth() {
    if (!_auth) {
        const db = await getDb();
        setAuth(await db.auth());
    }
    return _auth;
}
exports.getAuth = getAuth;
function setAuth(auth) {
    _auth = auth;
}
exports.setAuth = setAuth;
const FirePlugin = (config) => {
    exports.configuration = config;
    return (store) => {
        exports.firemodelVuex = store;
        firemodel_1.FireModel.dispatch = store.dispatch;
        store.subscribe((mutation, state) => {
            if (mutation.type === "route/ROUTE_CHANGED") {
                store.dispatch(addNamespace_1.addNamespace(FmConfigActions_1.FmConfigAction.watchRouteChanges), Object.assign({ Watch: firemodel_1.Watch,
                    Record: firemodel_1.Record,
                    List: firemodel_1.List, dispatch: store.dispatch, state: store.state, commit: store.commit }, mutation.payload));
            }
        });
        store.registerModule("@firemodel", store_1.FiremodelModule);
        queueLifecycleEvents(store, config).then(() => coreServices(store, Object.assign({ connect: true }, config)));
    };
};
exports.default = FirePlugin;
async function queueLifecycleEvents(store, config) {
    if (!config) {
        throw new FiremodelPluginError_1.FireModelPluginError(`There was no configuration sent into the FiremodelPlugin!`, "not-allowed");
        return;
    }
    const iterable = [
        ["onConnect", "connected"],
        ["onLogin", "logged-in"],
        ["onLogout", "logged-out"],
        ["onDisconnect", "disconnected"],
        ["onRouteChange", "route-changed"],
        ["onUserUpgraded", "user-upgraded"]
    ];
    for (const i of iterable) {
        const [name, event] = i;
        if (config[name]) {
            const empty = () => Promise.resolve();
            const cb = config[name];
            await store.commit(addNamespace_1.addNamespace("QUEUE_EVENT_HOOK" /* queueHook */), {
                on: event,
                name: `lifecycle-event-${event}`,
                cb
            });
        }
    }
}
async function coreServices(store, config) {
    if (config.connect) {
        await store.dispatch(addNamespace_1.addNamespace(FmConfigActions_1.FmConfigAction.connect), config.db);
    }
    if (config.watchAuth) {
        await store.dispatch(addNamespace_1.addNamespace(FmConfigActions_1.FmConfigAction.firebaseAuth), config);
    }
    if (config.anonymousAuth) {
        await store.dispatch(addNamespace_1.addNamespace(FmConfigActions_1.FmConfigAction.anonymousLogin), config);
    }
    if (config.watchRouteChanges) {
        await store.dispatch(addNamespace_1.addNamespace(FmConfigActions_1.FmConfigAction.watchRouteChanges));
    }
    store.commit(addNamespace_1.addNamespace("CORE_SERVICES_STARTED" /* coreServicesStarted */), {
        message: `all core firemodel plugin services started`,
        config: config.db
    });
}
//# sourceMappingURL=index.js.map