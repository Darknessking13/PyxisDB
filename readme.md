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

Here's a basic example of how to use PyxisDB:

```javascript
// import pyx from 'pyxisdb';
const pyx = require('pyxisdb');

// Connect to the Pyxiscloud server
pyx.connect('wss://your-pyxiscloud-server.com')
  .then(() => {
    console.log('Connected to PyxisCloud');
    
    // Define a schema
    const userSchema = pyx.schema({
      name: { type: 'string', required: true },
      age: { type: 'number' },
      email: { type: 'string', required: true }
    }, 'users');

    // Create a model
    const User = pyx.model('users', userSchema);

    // Insert a document
    User.insert({
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

- Real-time database operations
- Schema validation
- Automatic reconnection
- Support for insert, find, update, and delete operations
- Count and exists queries

## API Reference

### pyx.connect(url)

Connects to the Pyxiscloud server.

### pyx.schema(schemaDefinition, collectionName)

Defines a schema for a collection.

### pyx.model(collectionName, schema)

Creates a model based on a schema.

### Model Methods

- `insert(document)`: Inserts a new document
- `find(query)`: Finds documents matching the query
- `update(query, updateFields)`: Updates documents matching the query
- `delete(query)`: Deletes documents matching the query
- `count(query)`: Counts documents matching the query
- `exists(field, value)`: Checks if a document with the given field-value pair exists

## License

This project is licensed under the MIT License.
