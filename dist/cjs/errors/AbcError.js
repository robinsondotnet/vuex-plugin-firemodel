"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * An error within the Firemodel's Vuex plugin's **ABC** API. Takes _message_ and _type/subtype_ as
 * parameters. The code will be the `subtype`; the name is both.
 */
class AbcError extends Error {
    constructor(message, classification = "abc-api/error") {
        super(message);
        this.firemodel = true;
        this.abc = true;
        const parts = classification.split("/");
        const [type, subType] = parts.length === 1 ? ["abc-api", parts[0]] : parts;
        this.name = `${type}/${subType}`;
        this.code = subType;
    }
}
exports.AbcError = AbcError;
//# sourceMappingURL=AbcError.js.map