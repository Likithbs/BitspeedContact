import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-frontend-domain.com'] // Update this with your frontend URL
    : ['http://localhost:5173', 'http://localhost:3000']
}));
app.use(express.json());

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../dist')));
}

// Database setup - Use persistent file in production
const dbPath = process.env.NODE_ENV === 'production' ? './contacts.db' : ':memory:';
const db = new sqlite3.Database(dbPath);

// Initialize database schema
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS Contact (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phoneNumber TEXT,
      email TEXT,
      linkedId INTEGER,
      linkPrecedence TEXT CHECK(linkPrecedence IN ('primary', 'secondary')),
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      deletedAt DATETIME NULL,
      FOREIGN KEY (linkedId) REFERENCES Contact(id)
    )
  `);

  // Create indexes for better performance
  db.run(`CREATE INDEX IF NOT EXISTS idx_email ON Contact(email)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_phone ON Contact(phoneNumber)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_linkedId ON Contact(linkedId)`);
});

// Helper function to get all contacts in a chain
function getAllContactsInChain(contactId, callback) {
  const query = `
    WITH RECURSIVE contact_chain AS (
      -- Find the primary contact (root of the chain)
      SELECT id, phoneNumber, email, linkedId, linkPrecedence, createdAt, updatedAt
      FROM Contact 
      WHERE (id = ? OR linkedId = ?) AND deletedAt IS NULL AND linkPrecedence = 'primary'
      
      UNION ALL
      
      -- Find all secondary contacts linked to the primary
      SELECT c.id, c.phoneNumber, c.email, c.linkedId, c.linkPrecedence, c.createdAt, c.updatedAt
      FROM Contact c
      INNER JOIN contact_chain cc ON c.linkedId = cc.id
      WHERE c.deletedAt IS NULL
    )
    SELECT * FROM contact_chain
    ORDER BY linkPrecedence DESC, createdAt ASC
  `;
  
  db.all(query, [contactId, contactId], callback);
}

// Helper function to find contacts by email or phone
function findContactsByEmailOrPhone(email, phoneNumber, callback) {
  let query = `
    SELECT * FROM Contact 
    WHERE deletedAt IS NULL AND (
  `;
  const params = [];
  const conditions = [];

  if (email) {
    conditions.push('email = ?');
    params.push(email);
  }
  if (phoneNumber) {
    conditions.push('phoneNumber = ?');
    params.push(phoneNumber);
  }

  query += conditions.join(' OR ') + ')';
  
  db.all(query, params, callback);
}

// Helper function to get primary contact of a chain
function getPrimaryContact(contactId, callback) {
  const query = `
    SELECT * FROM Contact 
    WHERE deletedAt IS NULL AND (
      (id = ? AND linkPrecedence = 'primary') OR
      (id = (SELECT COALESCE(linkedId, id) FROM Contact WHERE id = ? AND deletedAt IS NULL))
    )
    ORDER BY linkPrecedence DESC, createdAt ASC
    LIMIT 1
  `;
  
  db.get(query, [contactId, contactId], callback);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Main identify endpoint
app.post('/identify', (req, res) => {
  const { email, phoneNumber } = req.body;

  // Validate input
  if (!email && !phoneNumber) {
    return res.status(400).json({
      error: 'Either email or phoneNumber must be provided'
    });
  }

  findContactsByEmailOrPhone(email, phoneNumber, (err, existingContacts) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (existingContacts.length === 0) {
      // No existing contacts, create new primary contact
      const insertQuery = `
        INSERT INTO Contact (phoneNumber, email, linkedId, linkPrecedence, createdAt, updatedAt)
        VALUES (?, ?, NULL, 'primary', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
      
      db.run(insertQuery, [phoneNumber || null, email || null], function(err) {
        if (err) {
          console.error('Insert error:', err);
          return res.status(500).json({ error: 'Failed to create contact' });
        }

        return res.json({
          contact: {
            primaryContatctId: this.lastID,
            emails: email ? [email] : [],
            phoneNumbers: phoneNumber ? [phoneNumber] : [],
            secondaryContactIds: []
          }
        });
      });
      return;
    }

    // Find all unique contact chains
    const contactChains = new Map();
    let processedContacts = 0;

    existingContacts.forEach(contact => {
      const chainId = contact.linkPrecedence === 'primary' ? contact.id : contact.linkedId;
      
      getAllContactsInChain(chainId, (err, chainContacts) => {
        if (err) {
          console.error('Chain lookup error:', err);
          return res.status(500).json({ error: 'Failed to process contacts' });
        }

        contactChains.set(chainId, chainContacts);
        processedContacts++;

        if (processedContacts === existingContacts.length) {
          processContactChains();
        }
      });
    });

    function processContactChains() {
      const chainIds = Array.from(contactChains.keys());
      
      if (chainIds.length === 1) {
        // Single chain - check if we need to add new info
        const chainId = chainIds[0];
        const contacts = contactChains.get(chainId);
        
        const hasEmail = email && contacts.some(c => c.email === email);
        const hasPhone = phoneNumber && contacts.some(c => c.phoneNumber === phoneNumber);
        
        if (!hasEmail || !hasPhone) {
          // Need to create secondary contact with new information
          const primaryContact = contacts.find(c => c.linkPrecedence === 'primary');
          
          const insertQuery = `
            INSERT INTO Contact (phoneNumber, email, linkedId, linkPrecedence, createdAt, updatedAt)
            VALUES (?, ?, ?, 'secondary', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `;
          
          db.run(insertQuery, [phoneNumber || null, email || null, primaryContact.id], function(err) {
            if (err) {
              console.error('Insert secondary error:', err);
              return res.status(500).json({ error: 'Failed to create secondary contact' });
            }

            // Refresh the chain and return response
            getAllContactsInChain(primaryContact.id, (err, updatedContacts) => {
              if (err) {
                console.error('Chain refresh error:', err);
                return res.status(500).json({ error: 'Failed to refresh contacts' });
              }

              returnResponse(updatedContacts);
            });
          });
        } else {
          // Exact match found, return existing chain
          returnResponse(contacts);
        }
      } else if (chainIds.length > 1) {
        // Multiple chains need to be merged
        const allContacts = Array.from(contactChains.values()).flat();
        const primaryContacts = allContacts.filter(c => c.linkPrecedence === 'primary');
        
        // Find the oldest primary contact
        primaryContacts.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        const oldestPrimary = primaryContacts[0];
        
        // Convert other primary contacts to secondary
        const updatePromises = primaryContacts.slice(1).map(contact => {
          return new Promise((resolve, reject) => {
            const updateQuery = `
              UPDATE Contact 
              SET linkPrecedence = 'secondary', linkedId = ?, updatedAt = CURRENT_TIMESTAMP
              WHERE id = ?
            `;
            
            db.run(updateQuery, [oldestPrimary.id, contact.id], function(err) {
              if (err) {
                reject(err);
              } else {
                // Update all contacts that were linked to this former primary
                const updateChildrenQuery = `
                  UPDATE Contact 
                  SET linkedId = ?, updatedAt = CURRENT_TIMESTAMP
                  WHERE linkedId = ? AND id != ?
                `;
                
                db.run(updateChildrenQuery, [oldestPrimary.id, contact.id, contact.id], (err) => {
                  if (err) {
                    reject(err);
                  } else {
                    resolve();
                  }
                });
              }
            });
          });
        });

        Promise.all(updatePromises)
          .then(() => {
            // Check if we need to add new contact with different info
            const hasEmail = email && allContacts.some(c => c.email === email);
            const hasPhone = phoneNumber && allContacts.some(c => c.phoneNumber === phoneNumber);
            
            if ((!email || hasEmail) && (!phoneNumber || hasPhone)) {
              // No new info needed, return merged chain
              getAllContactsInChain(oldestPrimary.id, (err, mergedContacts) => {
                if (err) {
                  console.error('Merged chain error:', err);
                  return res.status(500).json({ error: 'Failed to get merged contacts' });
                }
                returnResponse(mergedContacts);
              });
            } else {
              // Need to add new contact with different info
              const insertQuery = `
                INSERT INTO Contact (phoneNumber, email, linkedId, linkPrecedence, createdAt, updatedAt)
                VALUES (?, ?, ?, 'secondary', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
              `;
              
              db.run(insertQuery, [phoneNumber || null, email || null, oldestPrimary.id], function(err) {
                if (err) {
                  console.error('Insert merged secondary error:', err);
                  return res.status(500).json({ error: 'Failed to create secondary contact' });
                }

                getAllContactsInChain(oldestPrimary.id, (err, finalContacts) => {
                  if (err) {
                    console.error('Final chain error:', err);
                    return res.status(500).json({ error: 'Failed to get final contacts' });
                  }
                  returnResponse(finalContacts);
                });
              });
            }
          })
          .catch(err => {
            console.error('Merge error:', err);
            return res.status(500).json({ error: 'Failed to merge contacts' });
          });
      }
    }

    function returnResponse(contacts) {
      const primary = contacts.find(c => c.linkPrecedence === 'primary');
      const secondaries = contacts.filter(c => c.linkPrecedence === 'secondary');
      
      const emails = [...new Set([primary.email, ...secondaries.map(c => c.email)].filter(Boolean))];
      const phoneNumbers = [...new Set([primary.phoneNumber, ...secondaries.map(c => c.phoneNumber)].filter(Boolean))];
      
      res.json({
        contact: {
          primaryContatctId: primary.id,
          emails,
          phoneNumbers,
          secondaryContactIds: secondaries.map(c => c.id)
        }
      });
    }
  });
});

// Get all contacts endpoint for admin interface
app.get('/contacts', (req, res) => {
  const query = `
    SELECT * FROM Contact 
    WHERE deletedAt IS NULL 
    ORDER BY linkPrecedence DESC, createdAt ASC
  `;
  
  db.all(query, [], (err, contacts) => {
    if (err) {
      console.error('Get contacts error:', err);
      return res.status(500).json({ error: 'Failed to get contacts' });
    }
    
    res.json({ contacts });
  });
});

// Clear all contacts endpoint for testing
app.delete('/contacts', (req, res) => {
  const query = `DELETE FROM Contact`;
  
  db.run(query, [], function(err) {
    if (err) {
      console.error('Clear contacts error:', err);
      return res.status(500).json({ error: 'Failed to clear contacts' });
    }
    
    res.json({ message: 'All contacts cleared', deletedRows: this.changes });
  });
});

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../dist/index.html'));
  });
}

app.listen(port, () => {
  console.log(`🚀 Bitespeed Contact Reconciliation API running on port ${port}`);
  console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API endpoint: /identify`);
});