# PyxisDB

*PyxisDB* is a real-time database package for communicating with Pyxiscloud server. It provides a simple and efficient way to interact with your database using WebSocket connections.

## Documents
*https://docs.pyxisdb.letz.dev/*

## Installation
First you need to install, Check [PyxiCloud](https://github.com/Darknessking13/PyxiCloud)

To install PyxisDB, use npm:

```bash
npm install pyxisdb@latest
```

## Usage

PyxisDB now supports both JavaScript and TypeScript. Here's how to import and use it:

### JavaScript
```javascript
const pyx = require('pyxisdb').default;
```

### TypeScript
```typescript
import pyx from "pyxisdb";
```

Here's a basic example of how to use PyxisDB:

```typescript
// Connect to the Pyxiscloud server
pyx.connect('pyx://<hostname/ip>:<port>')
  .then(() => {
    console.log('Connected to PyxisCloud');
    
    // Define a schema
    const userSchema = new pyx.Schema({
      name: { type: 'string', required: true },
      age: { type: 'number' },
      email: { type: 'string', required: true }
    }, 'users');

    // Create a model
    const User = pyx.model('users', userSchema);

    // Insert a document
    User.insertOne({
      name: 'John Doe',
      age: 30,
      email: 'john@example.com'
    })
    .then(result => console.log('Inserted:', result))
    .catch(error => console.error('Insert error:', error));

    // Find documents
    User.find({ age: { $gte: 18 } })
      .then(users => console.log('Adult users:', users))
      .catch(error => console.error('Find error:', error));
  })
  .catch(error => console.error('Connection error:', error));
```

## Features

- Real-time database operations using WebSocket protocol
- Full TypeScript support with type definitions
- Schema validation and management
- Automatic reconnection handling
- Support for complex queries and operations
- Event-based communication
- Heartbeat mechanism for connection stability
- Request timeout handling
- Comprehensive error handling

## API Reference

### Connection

- `pyx.connect(url: string): Promise<void>`: Connects to the Pyxiscloud server

### Schema

- `new pyx.Schema(definition: Record<string, any>, collectionName: string)`: Creates a new schema

### Model Methods

All model methods return Promises and support TypeScript types:

#### Query Operations
- `find(query?: Record<string, any>)`: Finds all documents matching the query
- `findOne(query?: Record<string, any>)`: Finds the first document matching the query

#### Insert Operations
- `insertOne(document: Record<string, any>)`: Inserts a single document
- `insertMany(documents: Record<string, any>[])`: Inserts multiple documents

#### Update Operations
- `updateOne(query: Record<string, any>, updateFields: Record<string, any>)`: Updates the first matching document
- `updateMany(query: Record<string, any>, updateFields: Record<string, any>)`: Updates all matching documents

#### Delete Operations
- `deleteOne(query: Record<string, any>)`: Deletes the first matching document
- `deleteMany(query: Record<string, any>)`: Deletes all matching documents

## Changelog

### Version 0.0.3-beta
- Added full TypeScript support with type definitions
- Introduced new query methods: findOne, insertMany, updateMany, deleteOne, deleteMany
- Improved WebSocket connection handling with heartbeat mechanism
- Added request timeout handling
- Enhanced error handling and type safety
- Updated documentation and examples
- Added TypeScript configuration and build setup

## License

``This project is licensed under the MIT License.``