import WebSocket from 'ws';
import { EventEmitter } from 'events';
import crypto from 'crypto';

const ENCRYPTION_ALGORITHM = 'aes-256-cbc';

// Schema class remains unchanged
export class Schema {
  constructor(
    public definition: Record<string, any>,
    public collectionName: string
  ) {}

  async save(pyxisdb: PyxisDB): Promise<this> {
    try {
      await pyxisdb.sendRequest('CreateSchema', {
        collectionName: this.collectionName,
        schemaDefinition: this.definition
      });
      return this;
    } catch (error: any) {
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

class PyxisDB extends EventEmitter {
    private ws: WebSocket | null = null;
    private connected = false;
    private authenticated = false;
    private sessionToken: string | null = null;
    private requestQueue = new Map<string, { resolve: Function, reject: Function, timeout: NodeJS.Timeout }>();
    private requestTimeout = 30000; // 30 seconds
    private connectionPromise: Promise<void> | null = null;
    private credentials: { username: string; password: string } | null = null;
  
    async connect(url: string, credentials: { username: string; password: string }): Promise<void> {
      this.credentials = credentials;
      
      if (this.connectionPromise) {
        return this.connectionPromise;
      }
  
      this.connectionPromise = new Promise((resolve, reject) => {
        const wsUrl = url.replace('pyx://', 'ws://');
        
        this.ws = new WebSocket(wsUrl, 'pyxisdb-protocol');
        
        this.ws.on('open', async () => {
          this.connected = true;
          this.setupHeartbeat();
          
          try {
            await this.authenticate();
            this.emit('connected');
            resolve();
          } catch (error) {
            reject(error);
          }
        });
  
        this.ws.on('message', (data: WebSocket.Data) => {
          try {
            const response = JSON.parse(data.toString());
            const { requestId, status, data: responseData, message } = response;
            
            if (this.requestQueue.has(requestId)) {
              const { resolve, reject, timeout } = this.requestQueue.get(requestId)!;
              clearTimeout(timeout);
              this.requestQueue.delete(requestId);
              
              if (status === 'success') {
                resolve(responseData);
              } else {
                reject(new Error(message));
              }
            }
          } catch (error) {
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
  
    private async authenticate(): Promise<void> {
        if (!this.credentials) {
          throw new Error('Credentials not provided');
        }
    
        try {
          const response = await this.sendRequestUnencrypted<{ sessionToken: string }>('Authenticate', this.credentials);
          if (typeof response.sessionToken !== 'string' || response.sessionToken.length === 0) {
            throw new Error('Server did not provide a valid session token');
          }
          this.sessionToken = response.sessionToken;
          this.authenticated = true;
        } catch (error) {
          this.authenticated = false;
          this.sessionToken = null;
          throw error;
        }
    }
    
    private setupHeartbeat(): void {
        if (this.ws) {
          this.ws.on('ping', () => {
            this.ws?.pong();
          });
        }
    }

    private async sendRequestUnencrypted<T>(type: string, data: any): Promise<T> {
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
    
    async sendRequest<T>(type: string, data: any): Promise<T> {
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
    model(collectionName: string, schema?: Schema) {
        const self = this;
        if (schema) {
          schema.save(this).catch(console.error);
        }

        return {
          async find(query: Record<string, any> = {}) {
            return self.sendRequest('Query', {
              collectionName,
              operation: 'find',
              query
            });
          },

          async findOne(query: Record<string, any> = {}) {
            return self.sendRequest('Query', {
              collectionName,
              operation: 'findOne',
              query
            });
          },

          async insertOne(document: Record<string, any>) {
            return self.sendRequest('Query', {
              collectionName,
              operation: 'insertOne',
              document
            });
          },

          async insertMany(documents: Record<string, any>[]) {
            return self.sendRequest('Query', {
              collectionName,
              operation: 'insertMany',
              documents
            });
          },

          async updateOne(query: Record<string, any>, updateFields: Record<string, any>) {
            return self.sendRequest('Query', {
              collectionName,
              operation: 'updateOne',
              query,
              updateFields
            });
          },

          async updateMany(query: Record<string, any>, updateFields: Record<string, any>) {
            return self.sendRequest('Query', {
              collectionName,
              operation: 'updateMany',
              query,
              updateFields
            });
          },

          async deleteOne(query: Record<string, any>) {
            return self.sendRequest('Query', {
              collectionName,
              operation: 'deleteOne',
              query
            });
          },

          async deleteMany(query: Record<string, any>) {
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

export interface Pyx {
  connect: (url: string, credentials: { username: string; password: string }) => Promise<void>;
  Schema: new (definition: Record<string, any>, collectionName: string) => Schema;
  model: (collectionName: string, schema?: Schema) => ReturnType<PyxisDB['model']>;
}

export const pyx: Pyx = {
  connect: (url: string, credentials: { username: string; password: string }) => 
    pyxisdb.connect(url, credentials),
  Schema: Schema,
  model: (collectionName: string, schema?: Schema) => pyxisdb.model(collectionName, schema)
};

export default pyx;