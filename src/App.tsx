import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Database, 
  Search, 
  Trash2, 
  RefreshCw, 
  Send,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  User,
  Mail,
  Phone,
  Link,
  Clock,
  Crown,
  GitBranch
} from 'lucide-react';

interface Contact {
  id: number;
  phoneNumber: string | null;
  email: string | null;
  linkedId: number | null;
  linkPrecedence: 'primary' | 'secondary';
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface IdentifyResponse {
  contact: {
    primaryContatctId: number;
    emails: string[];
    phoneNumbers: string[];
    secondaryContactIds: number[];
  };
}

function App() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [identifyLoading, setIdentifyLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [response, setResponse] = useState<IdentifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRawResponse, setShowRawResponse] = useState(false);

  // Use relative URLs for API calls - they'll be proxied in development and work directly in production
  const API_BASE = '';

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/contacts`);
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts);
      }
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleIdentify = async () => {
    if (!email && !phoneNumber) {
      setError('Please provide either email or phone number');
      return;
    }

    setIdentifyLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch(`${API_BASE}/identify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email || undefined,
          phoneNumber: phoneNumber || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setResponse(data);
        await fetchContacts(); // Refresh contacts after identify
      } else {
        setError(data.error || 'Failed to identify contact');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIdentifyLoading(false);
    }
  };

  const clearAllContacts = async () => {
    if (!window.confirm('Are you sure you want to clear all contacts? This cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/contacts`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setContacts([]);
        setResponse(null);
        setError(null);
      }
    } catch (err) {
      console.error('Failed to clear contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  const getContactChains = () => {
    const chains = new Map<number, Contact[]>();
    
    contacts.forEach(contact => {
      const chainId = contact.linkPrecedence === 'primary' ? contact.id : contact.linkedId!;
      if (!chains.has(chainId)) {
        chains.set(chainId, []);
      }
      chains.get(chainId)!.push(contact);
    });

    // Sort contacts within each chain
    chains.forEach(chain => {
      chain.sort((a, b) => {
        if (a.linkPrecedence !== b.linkPrecedence) {
          return a.linkPrecedence === 'primary' ? -1 : 1;
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
    });

    return Array.from(chains.values());
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-600 rounded-lg">
              <GitBranch className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Bitespeed Contact Reconciliation</h1>
              <p className="text-slate-600">Contact identity linking and management system</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* API Testing Panel */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-6">
                <Search className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-slate-800">Test /identify Endpoint</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Mail className="w-4 h-4 inline mr-1" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g., lorraine@hillvalley.edu"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="e.g., 123456"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>

                <button
                  onClick={handleIdentify}
                  disabled={identifyLoading || (!email && !phoneNumber)}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {identifyLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {identifyLoading ? 'Processing...' : 'Identify Contact'}
                </button>
              </div>

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-800 font-medium">Error</p>
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                </div>
              )}

              {response && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <h3 className="text-lg font-semibold text-slate-800">Response</h3>
                    </div>
                    <button
                      onClick={() => setShowRawResponse(!showRawResponse)}
                      className="flex items-center gap-1 text-slate-600 hover:text-slate-800 text-sm"
                    >
                      {showRawResponse ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      {showRawResponse ? 'Hide' : 'Show'} Raw JSON
                    </button>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm font-medium text-green-800">Primary Contact ID</p>
                        <p className="text-green-700 font-mono">{response.contact.primaryContatctId}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-green-800">Secondary Contact IDs</p>
                        <p className="text-green-700 font-mono">
                          [{response.contact.secondaryContactIds.join(', ')}]
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-medium text-green-800">Emails</p>
                        <div className="flex flex-wrap gap-1">
                          {response.contact.emails.map((email, index) => (
                            <span key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                              {email}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-green-800">Phone Numbers</p>
                        <div className="flex flex-wrap gap-1">
                          {response.contact.phoneNumbers.map((phone, index) => (
                            <span key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                              {phone}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {showRawResponse && (
                    <div className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto">
                      <pre className="text-sm">{JSON.stringify(response, null, 2)}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Contact Database Panel */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-slate-600" />
                  <h2 className="text-xl font-semibold text-slate-800">Contact Database</h2>
                  <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-full text-sm">
                    {contacts.length} contacts
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={fetchContacts}
                    disabled={loading}
                    className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Refresh"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={clearAllContacts}
                    disabled={loading}
                    className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-colors"
                    title="Clear All"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                  </div>
                ) : contacts.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No contacts found</p>
                    <p className="text-sm">Use the identify endpoint to create contacts</p>
                  </div>
                ) : (
                  getContactChains().map((chain, chainIndex) => (
                    <div key={chainIndex} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                      <div className="flex items-center gap-2 mb-3">
                        <Link className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-medium text-slate-600">
                          Contact Chain {chainIndex + 1}
                        </span>
                        <span className="text-xs text-slate-500">
                          ({chain.length} contact{chain.length !== 1 ? 's' : ''})
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        {chain.map((contact, contactIndex) => (
                          <div
                            key={contact.id}
                            className={`p-3 rounded-lg border ${
                              contact.linkPrecedence === 'primary'
                                ? 'bg-blue-50 border-blue-200'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  {contact.linkPrecedence === 'primary' ? (
                                    <Crown className="w-4 h-4 text-blue-600" />
                                  ) : (
                                    <User className="w-4 h-4 text-slate-500" />
                                  )}
                                  <span className="font-medium text-slate-800">
                                    ID: {contact.id}
                                  </span>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    contact.linkPrecedence === 'primary'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {contact.linkPrecedence}
                                  </span>
                                </div>
                                
                                <div className="space-y-1 text-sm">
                                  {contact.email && (
                                    <div className="flex items-center gap-2 text-slate-600">
                                      <Mail className="w-3 h-3" />
                                      <span>{contact.email}</span>
                                    </div>
                                  )}
                                  {contact.phoneNumber && (
                                    <div className="flex items-center gap-2 text-slate-600">
                                      <Phone className="w-3 h-3" />
                                      <span>{contact.phoneNumber}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 text-slate-500">
                                    <Clock className="w-3 h-3" />
                                    <span className="text-xs">
                                      Created: {formatDateTime(contact.createdAt)}
                                    </span>
                                  </div>
                                  {contact.linkedId && (
                                    <div className="flex items-center gap-2 text-slate-500">
                                      <Link className="w-3 h-3" />
                                      <span className="text-xs">
                                        Linked to: {contact.linkedId}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Documentation */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">API Documentation</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-slate-700 mb-2">POST /identify</h3>
              <p className="text-slate-600 mb-3">
                Identifies and consolidates contact information across multiple purchases.
              </p>
              
              <div className="bg-slate-100 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">Request Body:</p>
                  <pre className="text-xs bg-slate-800 text-slate-100 p-2 rounded mt-1 overflow-x-auto">
{`{
  "email"?: string,
  "phoneNumber"?: string
}`}
                  </pre>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-slate-700">Response:</p>
                  <pre className="text-xs bg-slate-800 text-slate-100 p-2 rounded mt-1 overflow-x-auto">
{`{
  "contact": {
    "primaryContatctId": number,
    "emails": string[],
    "phoneNumbers": string[],
    "secondaryContactIds": number[]
  }
}`}
                  </pre>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">Linking Logic</h4>
                <ul className="text-blue-700 space-y-1 text-xs">
                  <li>• Contacts are linked by shared email or phone number</li>
                  <li>• Oldest contact becomes the primary contact</li>
                  <li>• New information creates secondary contacts</li>
                  <li>• Multiple contact chains can be merged</li>
                </ul>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-2">Features</h4>
                <ul className="text-green-700 space-y-1 text-xs">
                  <li>• Real-time contact consolidation</li>
                  <li>• Chain merging logic</li>
                  <li>• Primary/secondary relationship management</li>
                  <li>• Comprehensive contact tracking</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;