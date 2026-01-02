# my-service

Microservice generated with Navis.js

## Installation

```bash
npm install
```

## Running

### Local Development

```bash
npm start
# or
node service.js
```

### AWS Lambda

Deploy `lambda.js` to AWS Lambda and configure API Gateway.

## API Endpoints

- `GET /` - Service information
- `GET /health` - Health check

## Development

Add your routes in `service.js`:

```javascript
app.get('/api/users', (req, res) => {
  // Your route handler
});
```
