# PyxisDB

*PyxisDB* is a real-time database package for communicating with PyxiCloud server. It provides a secure and efficient way to interact with your database using WebSocket connections.

## Documentation
*https://docs.pyxisdb.letz.dev/*

## Installation
First, you need to install and set up [PyxiCloud](https://github.com/Darknessking13/PyxiCloud).

```bash
npm install pyxisdb@latest
```

## Quick Start

```javascript
const pyx = require('pyxisdb').default;
```

```typescript
import pyx from "pyxisdb";

// Connect with authentication
pyx.connect('pyx://<hostname/ip>:<port>', {
  username: 'your_username',
  password: 'your_password'
})
.then(() => {
  console.log('Connected and authenticated');
  
  // Define a schema
  const userSchema = new pyx.Schema({
    name: { type: 'string', required: true },
    email: { type: 'string', required: true, unique: true }
  }, 'users');

  // Create and use model
  const User = pyx.model('users', userSchema);
  
  // Insert data
  User.insertOne({
    name: 'John Doe',
    email: 'john@example.com'
  })
  .then(result => console.log('User created:', result));
})
.catch(error => console.error('Connection error:', error));
```

## Features

- 🔐 Secure authentication system
- 📦 Automatic backup management
- 🔄 Robust connection handling with auto-reconnect
- ✨ Schema validation
- 🚀 Real-time operations
- 💪 TypeScript support
- ⚡ High-performance WebSocket protocol
- 🛡️ Rate limiting protection

## API Reference

### Connection
```typescript
pyx.connect(url: string, auth: {
  username: string;
  password: string;
}): Promise<void>
```

### Schema Definition
```typescript
new pyx.Schema({
  field: {
    type: string;
    required?: boolean;
    unique?: boolean;
    default?: any;
  }
}, collectionName: string)
```

### Model Operations

#### Query Operations
```typescript
// Find documents
Model.find(query?: Record<string, any>)
Model.findOne(query?: Record<string, any>)

// Insert documents
Model.insertOne(document: Record<string, any>)
Model.insertMany(documents: Record<string, any>[])

// Update documents
Model.updateOne(query: Record<string, any>, update: Record<string, any>)
Model.updateMany(query: Record<string, any>, update: Record<string, any>)

// Delete documents
Model.deleteOne(query: Record<string, any>)
Model.deleteMany(query: Record<string, any>)
```

## Query Operators

```typescript
// Comparison
{ field: { $eq: value } }    // equals
{ field: { $ne: value } }    // not equals
{ field: { $gt: value } }    // greater than
{ field: { $gte: value } }   // greater than or equal
{ field: { $lt: value } }    // less than
{ field: { $lte: value } }   // less than or equal
{ field: { $in: [values] } } // in array
{ field: { $nin: [values] }} // not in array
```

## Changelog

### Version 0.0.5-beta (Latest)
- 🔐 Added authentication system with secure token management
- 🔐 Added encryption/decryption for data
- 💾 Implemented automatic backup system with configurable intervals
- 🔄 Enhanced connection stability with improved reconnection logic
- 🛡️ Added IP whitelist/blacklist support
- ⚡ Improved WebSocket protocol handling
- 🔒 Added rate limiting protection
- 📝 Updated documentation and examples

## License

This project is licensed under the MIT License.
```