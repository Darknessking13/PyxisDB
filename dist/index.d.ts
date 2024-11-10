import { EventEmitter } from 'events';
export declare class Schema {
    definition: Record<string, any>;
    collectionName: string;
    constructor(definition: Record<string, any>, collectionName: string);
    save(pyxisdb: PyxisDB): Promise<this>;
}
declare class PyxisDB extends EventEmitter {
    private ws;
    private connected;
    private authenticated;
    private sessionToken;
    private requestQueue;
    private requestTimeout;
    private connectionPromise;
    private credentials;
    connect(url: string, credentials: {
        username: string;
        password: string;
    }): Promise<void>;
    private authenticate;
    private setupHeartbeat;
    private sendRequestUnencrypted;
    sendRequest<T>(type: string, data: any): Promise<T>;
    model(collectionName: string, schema?: Schema): {
        find(query?: Record<string, any>): Promise<unknown>;
        findOne(query?: Record<string, any>): Promise<unknown>;
        insertOne(document: Record<string, any>): Promise<unknown>;
        insertMany(documents: Record<string, any>[]): Promise<unknown>;
        updateOne(query: Record<string, any>, updateFields: Record<string, any>): Promise<unknown>;
        updateMany(query: Record<string, any>, updateFields: Record<string, any>): Promise<unknown>;
        deleteOne(query: Record<string, any>): Promise<unknown>;
        deleteMany(query: Record<string, any>): Promise<unknown>;
    };
}
export interface Pyx {
    connect: (url: string, credentials: {
        username: string;
        password: string;
    }) => Promise<void>;
    Schema: new (definition: Record<string, any>, collectionName: string) => Schema;
    model: (collectionName: string, schema?: Schema) => ReturnType<PyxisDB['model']>;
}
export declare const pyx: Pyx;
export default pyx;
