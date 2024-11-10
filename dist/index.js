"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pyx = exports.Schema = void 0;
const ws_1 = __importDefault(require("ws"));
const events_1 = require("events");
const ENCRYPTION_ALGORITHM = 'aes-256-cbc';
// Schema class remains unchanged
class Schema {
    constructor(definition, collectionName) {
        this.definition = definition;
        this.collectionName = collectionName;
    }
    async save(pyxisdb) {
        try {
            await pyxisdb.sendRequest('CreateSchema', {
                collectionName: this.collectionName,
                schemaDefinition: this.definition
            });
            return this;
        }
        catch (error) {
            if (error.message.includes('already exists')) {
                await pyxisdb.sendRequest('UpdateSchema', {
                    collectionName: this.collectionName,
                    schemaDefinition: this.definition
                });
                return this;
            }
            throw error;
        }
    }
}
exports.Schema = Schema;
class PyxisDB extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.ws = null;
        this.connected = false;
        this.authenticated = false;
        this.sessionToken = null;
        this.requestQueue = new Map();
        this.requestTimeout = 30000; // 30 seconds
        this.connectionPromise = null;
        this.credentials = null;
    }
    async connect(url, credentials) {
        this.credentials = credentials;
        if (this.connectionPromise) {
            return this.connectionPromise;
        }
        this.connectionPromise = new Promise((resolve, reject) => {
            const wsUrl = url.replace('pyx://', 'ws://');
            this.ws = new ws_1.default(wsUrl, 'pyxisdb-protocol');
            this.ws.on('open', async () => {
                this.connected = true;
                this.setupHeartbeat();
                try {
                    await this.authenticate();
                    this.emit('connected');
                    resolve();
                }
                catch (error) {
                    reject(error);
                }
            });
            this.ws.on('message', (data) => {
                try {
                    const response = JSON.parse(data.toString());
                    const { requestId, status, data: responseData, message } = response;
                    if (this.requestQueue.has(requestId)) {
                        const { resolve, reject, timeout } = this.requestQueue.get(requestId);
                        clearTimeout(timeout);
                        this.requestQueue.delete(requestId);
                        if (status === 'success') {
                            resolve(responseData);
                        }
                        else {
                            reject(new Error(message));
                        }
                    }
                }
                catch (error) {
                    console.error('Error processing message:', error);
                    this.emit('error', error);
                }
            });
            this.ws.on('close', () => {
                this.connected = false;
                this.authenticated = false;
                this.sessionToken = null;
                this.connectionPromise = null;
                this.emit('disconnected');
            });
            this.ws.on('error', (error) => {
                console.error('WebSocket error:', error);
                this.connected = false;
                this.authenticated = false;
                this.sessionToken = null;
                this.connectionPromise = null;
                reject(error);
            });
        });
        return this.connectionPromise;
    }
    async authenticate() {
        if (!this.credentials) {
            throw new Error('Credentials not provided');
        }
        try {
            const response = await this.sendRequestUnencrypted('Authenticate', this.credentials);
            if (typeof response.sessionToken !== 'string' || response.sessionToken.length === 0) {
                throw new Error('Server did not provide a valid session token');
            }
            this.sessionToken = response.sessionToken;
            this.authenticated = true;
        }
        catch (error) {
            this.authenticated = false;
            this.sessionToken = null;
            throw error;
        }
    }
    setupHeartbeat() {
        if (this.ws) {
            this.ws.on('ping', () => {
                this.ws?.pong();
            });
        }
    }
    async sendRequestUnencrypted(type, data) {
        if (!this.connected) {
            throw new Error('Not connected to server');
        }
        return new Promise((resolve, reject) => {
            const requestId = Math.random().toString(36).substring(7);
            const request = {
                type,
                data,
                requestId
            };
            const timeout = setTimeout(() => {
                if (this.requestQueue.has(requestId)) {
                    this.requestQueue.delete(requestId);
                    reject(new Error('Request timeout'));
                }
            }, this.requestTimeout);
            this.requestQueue.set(requestId, { resolve, reject, timeout });
            this.ws?.send(JSON.stringify(request));
        });
    }
    async sendRequest(type, data) {
        if (!this.connected) {
            throw new Error('Not connected to server');
        }
        if (!this.authenticated) {
            throw new Error('Not authenticated');
        }
        return new Promise((resolve, reject) => {
            const requestId = Math.random().toString(36).substring(7);
            const request = {
                type,
                data,
                requestId,
                sessionToken: this.sessionToken
            };
            const timeout = setTimeout(() => {
                if (this.requestQueue.has(requestId)) {
                    this.requestQueue.delete(requestId);
                    reject(new Error('Request timeout'));
                }
            }, this.requestTimeout);
            this.requestQueue.set(requestId, { resolve, reject, timeout });
            this.ws?.send(JSON.stringify(request));
        });
    }
    // model method remains unchanged
    model(collectionName, schema) {
        const self = this;
        if (schema) {
            schema.save(this).catch(console.error);
        }
        return {
            async find(query = {}) {
                return self.sendRequest('Query', {
                    collectionName,
                    operation: 'find',
                    query
                });
            },
            async findOne(query = {}) {
                return self.sendRequest('Query', {
                    collectionName,
                    operation: 'findOne',
                    query
                });
            },
            async insertOne(document) {
                return self.sendRequest('Query', {
                    collectionName,
                    operation: 'insertOne',
                    document
                });
            },
            async insertMany(documents) {
                return self.sendRequest('Query', {
                    collectionName,
                    operation: 'insertMany',
                    documents
                });
            },
            async updateOne(query, updateFields) {
                return self.sendRequest('Query', {
                    collectionName,
                    operation: 'updateOne',
                    query,
                    updateFields
                });
            },
            async updateMany(query, updateFields) {
                return self.sendRequest('Query', {
                    collectionName,
                    operation: 'updateMany',
                    query,
                    updateFields
                });
            },
            async deleteOne(query) {
                return self.sendRequest('Query', {
                    collectionName,
                    operation: 'deleteOne',
                    query
                });
            },
            async deleteMany(query) {
                return self.sendRequest('Query', {
                    collectionName,
                    operation: 'deleteMany',
                    query
                });
            }
        };
    }
}
const pyxisdb = new PyxisDB();
exports.pyx = {
    connect: (url, credentials) => pyxisdb.connect(url, credentials),
    Schema: Schema,
    model: (collectionName, schema) => pyxisdb.model(collectionName, schema)
};
exports.default = exports.pyx;
