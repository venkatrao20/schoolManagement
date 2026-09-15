import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/Modal';
import { ParentGuardian } from '../../types';
import api from '../../api/client';
import { useToast } from '../../components/Toast';
import { Search, UserPlus, Link2, Check } from 'lucide-react';

interface LinkParentModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  onSuccess: () => void;
}

export const LinkParentModal: React.FC<LinkParentModalProps> = ({
  isOpen,
  onClose,
  studentId,
  studentName,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'search' | 'create'>('search');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<ParentGuardian[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [isPrimaryContact, setIsPrimaryContact] = useState(false);
  const [isEmergencyContact, setIsEmergencyContact] = useState(true);
  const [relationshipNotes, setRelationshipNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Form for inline parent creation
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [relationship, setRelationship] = useState('GUARDIAN');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [occupation, setOccupation] = useState('');
  const [address, setAddress] = useState('');

  const { showToast } = useToast();

  useEffect(() => {
    if (searchTerm.trim().length >= 2) {
      const timer = setTimeout(async () => {
        try {
          const res = await api.get(`/parents?search=${encodeURIComponent(searchTerm)}`);
          setSearchResults(res.data.parents || []);
        } catch {
          // ignore
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  const handleLinkExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParentId) {
      showToast('Please select a parent/guardian to link', 'error');
      return;
    }

    setIsLoading(true);
    try {
      await api.post(`/students/${studentId}/parents`, {
        parentGuardianId: selectedParentId,
        isPrimaryContact,
        isEmergencyContact,
        relationshipNotes: relationshipNotes || null,
      });
      showToast('Parent/Guardian linked successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to link parent', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAndLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !phone || !email || !address) {
      showToast('Please fill all required parent fields', 'error');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Create parent
      const parentRes = await api.post('/parents', {
        firstName,
        lastName,
        relationship,
        phone,
        email,
        occupation: occupation || null,
        address,
      });

      const newParentId = parentRes.data.parent.id;

      // 2. Link parent to student
      await api.post(`/students/${studentId}/parents`, {
        parentGuardianId: newParentId,
        isPrimaryContact,
        isEmergencyContact,
        relationshipNotes: relationshipNotes || null,
      });

      showToast('New parent created and linked successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to create and link parent', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Link Parent / Guardian"
      subtitle={`Connecting a contact for student: ${studentName}`}
      maxWidth="xl"
    >
      <div className="space-y-4">
        {/* Toggle Mode */}
        <div className="flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setMode('search')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === 'search' ? 'bg-white shadow text-brand-700' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search Existing Parent</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('create')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === 'create' ? 'bg-white shadow text-brand-700' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create New Parent Inline</span>
          </button>
        </div>

        {mode === 'search' ? (
          <form onSubmit={handleLinkExisting} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Search by Name, Email, or Phone</label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Type parent name or phone number..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
                />
              </div>
            </div>

            {/* Results List */}
            <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-2 bg-slate-50/30">
              {searchResults.length > 0 ? (
                searchResults.map((parent) => (
                  <div
                    key={parent.id}
                    onClick={() => setSelectedParentId(parent.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                      selectedParentId === parent.id
                        ? 'border-brand-500 bg-brand-50/50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>{parent.firstName} {parent.lastName}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">{parent.relationship}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{parent.phone} • {parent.email}</div>
                    </div>
                    {selectedParentId === parent.id && (
                      <div className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  {searchTerm.length < 2 ? 'Search to find matching parents in records.' : 'No parents found matching your query.'}
                </div>
              )}
            </div>

            {/* Contact Settings */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
              <div className="font-bold text-slate-800">Contact Configuration</div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPrimaryContact}
                    onChange={(e) => setIsPrimaryContact(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-slate-700 font-medium">Primary Contact</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isEmergencyContact}
                    onChange={(e) => setIsEmergencyContact(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-slate-700 font-medium">Emergency Contact</span>
                </label>
              </div>

              <div>
                <input
                  type="text"
                  value={relationshipNotes}
                  onChange={(e) => setRelationshipNotes(e.target.value)}
                  placeholder="Optional relationship notes (e.g. Authorized for pick-up)..."
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 font-bold text-slate-600 bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedParentId || isLoading}
                className="px-5 py-2 font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-md disabled:opacity-50 flex items-center gap-1.5"
              >
                <Link2 className="w-4 h-4" />
                <span>{isLoading ? 'Linking...' : 'Link Parent'}</span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleCreateAndLink} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">First Name *</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Parent first name"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Last Name *</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Parent last name"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Relationship *</label>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50"
                >
                  <option value="FATHER">Father</option>
                  <option value="MOTHER">Mother</option>
                  <option value="GUARDIAN">Guardian</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Occupation</label>
                <input
                  type="text"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  placeholder="e.g. Architect"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number *</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="parent@example.com"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Address *</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                placeholder="Full address..."
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50"
              />
            </div>

            {/* Contact Settings */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
              <div className="font-bold text-slate-800">Contact Configuration</div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPrimaryContact}
                    onChange={(e) => setIsPrimaryContact(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-slate-700 font-medium">Primary Contact</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isEmergencyContact}
                    onChange={(e) => setIsEmergencyContact(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-slate-700 font-medium">Emergency Contact</span>
                </label>
              </div>
              <div>
                <input
                  type="text"
                  value={relationshipNotes}
                  onChange={(e) => setRelationshipNotes(e.target.value)}
                  placeholder="Optional relationship notes..."
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 font-bold text-slate-600 bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2 font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-md disabled:opacity-50 flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isLoading ? 'Creating & Linking...' : 'Create & Link'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
