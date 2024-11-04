const WebSocket = require('ws');

class PyxisDB {
    constructor() {
        this.url = null;
        this.ws = null;
        this.isConnected = false;
        this.schemas = new Map();
        this.models = new Map();
        this.connectionPromise = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.messageCallbacks = new Map();
        this.operationQueue = [];
    }

    connect(url) {
        if (this.isConnected) {
            return Promise.resolve(this.ping);
        }

        this.url = url;
        return this.establishConnection();
    }

    async establishConnection() {
        this.connectionPromise = new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.url, {
                mask: true,
                skipUTF8Validation: true
            });

            this.ws.on('open', async () => {
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.reconnectDelay = 1000;

                const startTime = Date.now();
                this.ws.ping('', true, (error) => {
                    if (error) {
                        reject(error);
                    } else {
                        this.ping = Date.now() - startTime;
                        resolve(this.ping);
                        this.processQueuedOperations();
                    }
                });
            });

            this.ws.on('error', (error) => {
                this.handleDisconnection(reject);
            });

            this.ws.on('close', () => {
                this.handleDisconnection(reject);
            });

            this.setupHeartbeat();

            this.ws.on('message', (data) => {
                try {
                    const response = JSON.parse(data);
                    if (response.requestId && this.messageCallbacks.has(response.requestId)) {
                        const { resolve, reject } = this.messageCallbacks.get(response.requestId);
                        if (response.status === 'success') {
                            resolve(response.data);
                        } else {
                            reject(new Error(response.message));
                        }
                        this.messageCallbacks.delete(response.requestId);
                    }
                } catch (error) {
                    console.error('Error processing server response:', error);
                }
            });
        });

        return this.connectionPromise;
    }

    handleDisconnection(reject) {
        this.isConnected = false;
        this.ping = null;

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => {
                this.reconnectAttempts++;
                this.reconnectDelay *= 2;
                this.establishConnection();
            }, this.reconnectDelay);
        } else {
            reject(new Error('Failed to maintain connection to server'));
        }
    }

    setupHeartbeat() {
        const heartbeatInterval = setInterval(() => {
            if (this.isConnected) {
                this.ws.ping('', true, (error) => {
                    if (error) {
                        clearInterval(heartbeatInterval);
                    }
                });
            } else {
                clearInterval(heartbeatInterval);
            }
        }, 30000);

        this.ws.on('close', () => {
            clearInterval(heartbeatInterval);
        });
    }

    schema(schemaDefinition, collectionName) {
        return this.ensureConnection(() => {
            const schema = new Schema(schemaDefinition, this, collectionName);
            this.schemas.set(collectionName, schema);
            return schema;
        });
    }

    model(collectionName, schema) {
        return this.ensureConnection(() => {
            if (!schema) {
                schema = this.schemas.get(collectionName);
                if (!schema) {
                    throw new Error(`Schema for collection "${collectionName}" not found. Define it first using pyx.schema().`);
                }
            }
            const model = new Model(collectionName, schema, this);
            this.models.set(collectionName, model);
            return model;
        });
    }

    async sendMessage(message) {
        return this.ensureConnection(async () => {
            if (!this.isConnected) {
                throw new Error('Not connected to server');
            }
            
            return new Promise((resolve, reject) => {
                const requestId = Math.random().toString(36).substr(2, 9);
                message.requestId = requestId;
                this.messageCallbacks.set(requestId, { resolve, reject });
                
                this.ws.send(JSON.stringify(message), { mask: true }, (error) => {
                    if (error) {
                        this.messageCallbacks.delete(requestId);
                        reject(error);
                    }
                });
            });
        });
    }

    ensureConnection(operation) {
        if (this.isConnected) {
            return operation();
        } else {
            return new Promise((resolve, reject) => {
                this.operationQueue.push({ operation, resolve, reject });
            });
        }
    }

    async processQueuedOperations() {
        while (this.operationQueue.length > 0) {
            const { operation, resolve, reject } = this.operationQueue.shift();
            try {
                const result = await operation();
                resolve(result);
            } catch (error) {
                reject(error);
            }
        }
    }
}

class Schema {
    constructor(schemaDefinition, pyxisDB, collectionName) {
        this.schemaDefinition = schemaDefinition;
        this.pyxisDB = pyxisDB;
        this.collectionName = collectionName;
    }

    async createOrUpdateSchema() {
        try {
            await this.pyxisDB.sendMessage({
                type: 'CreateSchema',
                data: {
                    collectionName: this.collectionName,
                    schemaDefinition: this.schemaDefinition
                }
            });
        } catch (error) {
            if (error.message === 'Schema already exists') {
                await this.updateSchema();
            } else {
                throw error;
            }
        }
    }

    async updateSchema() {
        await this.pyxisDB.sendMessage({
            type: 'UpdateSchema',
            data: {
                collectionName: this.collectionName,
                schemaDefinition: this.schemaDefinition
            }
        });
    }

    validate(document, isUpdate = false) {
        for (const [field, definition] of Object.entries(this.schemaDefinition)) {
            if (!isUpdate && definition.required && !(field in document)) {
                throw new Error(`Field "${field}" is required.`);
            }

            if (field in document) {
                const value = document[field];
                
                if (value === null || value === undefined) {
                    if (!isUpdate) {
                        throw new Error(`Field "${field}" cannot be null or undefined.`);
                    }
                    continue;
                }

                if (definition.type === 'number' && typeof value !== 'number') {
                    throw new Error(`Field "${field}" must be a number.`);
                }

                if (definition.type === 'string' && typeof value !== 'string') {
                    throw new Error(`Field "${field}" must be a string.`);
                }

                if (definition.type === 'boolean' && typeof value !== 'boolean') {
                    throw new Error(`Field "${field}" must be a boolean.`);
                }

                if (definition.type === 'date' && !(value instanceof Date)) {
                    throw new Error(`Field "${field}" must be a Date object.`);
                }

                if (definition.type === 'object' && typeof value !== 'object') {
                    throw new Error(`Field "${field}" must be an object.`);
                }

                if (definition.type === 'array' && !Array.isArray(value)) {
                    throw new Error(`Field "${field}" must be an array.`);
                }
            }
        }
    }

    validateUpdate(updateFields) {
        const fieldsToValidate = {};
        for (const field in updateFields) {
            if (this.schemaDefinition[field]) {
                fieldsToValidate[field] = this.schemaDefinition[field];
            }
        }

        const updateSchema = new Schema(fieldsToValidate, this.pyxisDB, this.collectionName);
        updateSchema.validate(updateFields, true);
    }
}

class Model {
    constructor(collectionName, schema, pyxisDB) {
        this.collectionName = collectionName;
        this.schema = schema;
        this.pyxisDB = pyxisDB;
    }

    async insert(document) {
        this.schema.validate(document);
        await this.schema.createOrUpdateSchema();
        return this.pyxisDB.sendMessage({
            type: 'Query',
            data: {
                collectionName: this.collectionName,
                operation: 'insert',
                document
            }
        });
    }

    async find(query = {}) {
        await this.schema.createOrUpdateSchema();
        return this.pyxisDB.sendMessage({
            type: 'Query',
            data: {
                collectionName: this.collectionName,
                operation: 'find',
                query
            }
        });
    }

    async update(query, updateFields) {
        this.schema.validateUpdate(updateFields);
        await this.schema.createOrUpdateSchema();
        return this.pyxisDB.sendMessage({
            type: 'Query',
            data: {
                collectionName: this.collectionName,
                operation: 'update',
                query,
                updateFields
            }
        });
    }

    async delete(query) {
        await this.schema.createOrUpdateSchema();
        return this.pyxisDB.sendMessage({
            type: 'Query',
            data: {
                collectionName: this.collectionName,
                operation: 'delete',
                query
            }
        });
    }

    async count(query = {}) {
        await this.schema.createOrUpdateSchema();
        return this.pyxisDB.sendMessage({
            type: 'Query',
            data: {
                collectionName: this.collectionName,
                operation: 'count',
                query
            }
        });
    }

    async exists(field, value) {
        await this.schema.createOrUpdateSchema();
        return this.pyxisDB.sendMessage({
            type: 'Query',
            data: {
                collectionName: this.collectionName,
                operation: 'exists',
                field,
                value
            }
        });
    }
}

module.exports = new PyxisDB();
