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
    private requestQueue;
    private requestTimeout;
    private connectionPromise;
    connect(url: string): Promise<void>;
    private setupHeartbeat;
    sendRequest(type: string, data: any): Promise<any>;
    model(collectionName: string, schema?: Schema): {
        find(query?: Record<string, any>): Promise<any>;
        findOne(query?: Record<string, any>): Promise<any>;
        insertOne(document: Record<string, any>): Promise<any>;
        insertMany(documents: Record<string, any>[]): Promise<any>;
        updateOne(query: Record<string, any>, updateFields: Record<string, any>): Promise<any>;
        updateMany(query: Record<string, any>, updateFields: Record<string, any>): Promise<any>;
        deleteOne(query: Record<string, any>): Promise<any>;
        deleteMany(query: Record<string, any>): Promise<any>;
    };
}
export interface Pyx {
    connect: (url: string) => Promise<void>;
    Schema: new (definition: Record<string, any>, collectionName: string) => Schema;
    model: (collectionName: string, schema?: Schema) => ReturnType<PyxisDB['model']>;
}
export declare const pyx: Pyx;
export default pyx;
