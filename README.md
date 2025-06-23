# Bitespeed Contact Reconciliation Service

A sophisticated contact identity reconciliation system built for FluxKart.com to link customer purchases across different contact information.

## 🚀 Live Demo

**API Endpoint**: [Your Render URL]/identify

## 📋 API Documentation

### POST /identify

Identifies and consolidates contact information across multiple purchases.

**Request Body:**
```json
{
  "email"?: string,
  "phoneNumber"?: string
}
```

**Response:**
```json
{
  "contact": {
    "primaryContatctId": number,
    "emails": string[],
    "phoneNumbers": string[],
    "secondaryContactIds": number[]
  }
}
```

### Additional Endpoints

- `GET /contacts` - Retrieve all contacts (admin)
- `DELETE /contacts` - Clear all contacts (testing)
- `GET /health` - Health check endpoint

## 🛠 Technology Stack

- **Backend**: Node.js with Express
- **Database**: SQLite (production-ready with persistent storage)
- **Frontend**: React with TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Deployment**: Render.com

## 🏃‍♂️ Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Start API server:**
   ```bash
   npm run server
   ```

4. **Access the application:**
   - Admin Interface: http://localhost:5173
   - API Endpoint: http://localhost:3001/identify

## 🚀 Deployment on Render

### Automatic Deployment

1. **Connect your GitHub repository to Render**
2. **Create a new Web Service**
3. **Use these settings:**
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: `NODE_ENV=production`

### Manual Deployment

1. **Fork this repository**
2. **Push your changes to GitHub**
3. **Connect to Render and deploy**

The application includes a `render.yaml` file for easy deployment configuration.

## 💡 How It Works

### Contact Linking Logic

1. **New Contact**: If no existing contacts match, creates a new primary contact
2. **Single Chain Match**: If contacts match an existing chain, may create a secondary contact with new information
3. **Multiple Chain Match**: Merges multiple contact chains, with the oldest primary contact remaining as primary

### Example Scenarios

**Scenario 1: New Customer**
```json
Request: {"email": "doc@hillvalley.edu", "phoneNumber": "555-0123"}
Result: Creates new primary contact
```

**Scenario 2: Existing Customer with New Info**
```json
Request: {"email": "doc@hillvalley.edu", "phoneNumber": "555-0456"}
Result: Creates secondary contact linked to existing primary
```

**Scenario 3: Chain Merging**
```json
Request: {"email": "doc@hillvalley.edu", "phoneNumber": "marty-phone"}
Result: Merges two separate contact chains
```

## 🏗 Database Schema

```sql
CREATE TABLE Contact (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phoneNumber TEXT,
  email TEXT,
  linkedId INTEGER,
  linkPrecedence TEXT CHECK(linkPrecedence IN ('primary', 'secondary')),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  deletedAt DATETIME NULL,
  FOREIGN KEY (linkedId) REFERENCES Contact(id)
);
```

## 🧪 Testing

Use the admin interface to test various scenarios:

1. Create initial contacts with different email/phone combinations
2. Test linking logic by providing overlapping information
3. Verify chain merging with complex scenarios
4. Monitor the contact database in real-time

## 🔧 Configuration

Key configuration options:

- **Database**: SQLite with persistent storage in production
- **CORS**: Configured for production deployment
- **Port**: Configurable via PORT environment variable
- **Environment**: Automatic detection of production vs development

## 📊 Features

- **Advanced Contact Linking**: Automatically links contacts that share email addresses or phone numbers
- **Primary/Secondary Relationships**: Maintains hierarchical contact relationships with the oldest contact as primary
- **Chain Merging**: Intelligently merges separate contact chains when connections are discovered
- **Real-time Processing**: Instant contact consolidation and identity resolution
- **Beautiful Admin Interface**: Professional dashboard for testing and monitoring
- **Production Ready**: Comprehensive error handling, validation, and logging
- **Health Monitoring**: Built-in health check endpoint for monitoring
- **Persistent Storage**: SQLite database with disk persistence in production

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🎯 Production Deployment

The application is configured for production deployment with:

- Persistent SQLite database
- Production-optimized CORS settings
- Static file serving for the React frontend
- Health check endpoints for monitoring
- Environment-based configuration
- Proper error handling and logging

Perfect for deployment on Render, Railway, Heroku, or any Node.js hosting platform.