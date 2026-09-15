import './App.css';
import { useCallback, useEffect, useState } from 'react';

const API = '/api';
const emptyEnquiry = {
  studentName: '',
  dob: '',
  gender: 'Male',
  classAppliedFor: '',
  parentName: '',
  contactNumber: '',
  email: '',
  address: '',
  aadhaarCard: '',
  source: ''
};
const emptyApplication = { enquiryId: '', studentName: '', dob: '', gender: 'Male', classAppliedFor: '', parentName: '', contactNumber: '', previousSchool: '', aadhaarCard: '' };
const emptyParentRegister = { name: '', username: '', password: '', confirmPassword: '', contactNumber: '', email: '' };
const emptyChild = { studentName: '', dob: '', gender: 'Male', classAppliedFor: '', address: '', aadhaarCard: '', source: '' };

async function request(path, options = {}, token) {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API}${path}`, { ...options, headers: { ...(isFormData ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'Something went wrong');
  return body;
}

function Stat({ label, value, accent }) { return <div className={`stat ${accent}`}><span>{label}</span><strong>{value}</strong></div>; }

function App() {
  const [session, setSession] = useState(() => JSON.parse(localStorage.getItem('admissionSession') || 'null'));
  const [authView, setAuthView] = useState('staff');
  const [active, setActive] = useState('overview');
  const [dashboard, setDashboard] = useState({ enquiries: 0, applications: 0, admitted: 0, assessments: 0 });
  const [enquiries, setEnquiries] = useState([]);
  const [applications, setApplications] = useState([]);
  const [search, setSearch] = useState('');
  const [enquiryForm, setEnquiryForm] = useState(emptyEnquiry);
  const [applicationForm, setApplicationForm] = useState(emptyApplication);
  const [login, setLogin] = useState({ username: 'admissions01', password: 'test1234' });
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [parentLogin, setParentLogin] = useState({ username: '', password: '' });
  const [parentRegister, setParentRegister] = useState(emptyParentRegister);
  const [myChild, setMyChild] = useState(null);
  const [childForm, setChildForm] = useState(emptyChild);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [assessments, setAssessments] = useState([]);

  const loadData = useCallback(async () => {
    if (!session || session.role === 'Parent') return;
    try {
      const [stats, enquiryRows, applicationRows] = await Promise.all([
        request('/dashboard', {}, session.token),
        request('/enquiries', {}, session.token),
        request('/applications', {}, session.token)
      ]);
      setDashboard(stats);
      setEnquiries(enquiryRows);
      setApplications(applicationRows);
    } catch (err) {
      setError(err.message);
    }
  }, [session]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadMyChild = useCallback(async () => {
    if (!session || session.role !== 'Parent') return;
    try {
      setMyChild(await request('/parent/my-enquiry', {}, session.token));
    } catch (err) {
      setError(err.message);
    }
  }, [session]);

  useEffect(() => {
    loadMyChild();
  }, [loadMyChild]);

  const signIn = async event => {
    event.preventDefault();
    setError('');
    try {
      const user = await request('/auth/login', { method: 'POST', body: JSON.stringify(login) });
      localStorage.setItem('admissionSession', JSON.stringify(user));
      setSession(user);
    } catch (err) {
      setError(err.message);
    }
  };

  const parentSignIn = async event => {
    event.preventDefault();
    setError('');
    try {
      const user = await request('/parent/login', { method: 'POST', body: JSON.stringify(parentLogin) });
      localStorage.setItem('admissionSession', JSON.stringify(user));
      setSession(user);
    } catch (err) {
      setError(err.message);
    }
  };

  const parentRegisterSubmit = async event => {
    event.preventDefault();
    setError('');
    if (parentRegister.password !== parentRegister.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    try {
      const { confirmPassword, ...payload } = parentRegister;
      const user = await request('/parent/register', { method: 'POST', body: JSON.stringify(payload) });
      localStorage.setItem('admissionSession', JSON.stringify(user));
      setSession(user);
    } catch (err) {
      setError(err.message);
    }
  };

  const submitChild = async event => {
    event.preventDefault();
    setError('');
    try {
      const child = await request('/parent/enquiry', { method: 'POST', body: JSON.stringify(childForm) }, session.token);
      setMyChild(child);
      setNotice('Enquiry submitted successfully');
    } catch (err) {
      setError(err.message);
    }
  };

  const submit = async (event, kind) => {
    event.preventDefault();
    setError('');
    try {
      await request(
        kind === 'enquiry' ? '/enquiries' : '/applications',
        { method: 'POST', body: JSON.stringify(kind === 'enquiry' ? enquiryForm : applicationForm) },
        session.token
      );
      if (kind === 'enquiry') setEnquiryForm(emptyEnquiry);
      else setApplicationForm(emptyApplication);
      setNotice(`${kind === 'enquiry' ? 'Enquiry' : 'Application'} created successfully`);
      setActive(kind === 'enquiry' ? 'enquiries' : 'applications');
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const updateStatus = async (id, status, kind) => {
    try {
      await request(
        `/${kind}/${id}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify(kind === 'enquiries' ? { status } : { newStatus: status })
        },
        session.token
      );
      setNotice('Status updated successfully');
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const openApplication = async app => {
    try {
      setSelectedApplication(app);
      const [documentRows, assessmentRows] = await Promise.all([
        request(`/documents/application/${app.id}`, {}, session.token),
        request(`/assessments/application/${app.id}`, {}, session.token)
      ]);
      setDocuments(documentRows);
      setAssessments(assessmentRows);
    } catch (err) { setError(err.message); }
  };

  const refreshApplication = async () => {
    await loadData();
    if (selectedApplication) await openApplication(await request(`/applications/${selectedApplication.id}`, {}, session.token));
  };

  const exportConverted = async () => {
    try {
      setError('');
      const response = await fetch(`${API}/exports/converted`, {
        headers: { 'Authorization': `Bearer ${session.token}` }
      });
      if (!response.ok) throw new Error('Failed to export converted enquiries');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Converted_Enquiries_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setNotice('Converted enquiries exported successfully');
    } catch (err) {
      setError(err.message);
    }
  };

  const exportNonConverted = async () => {
    try {
      setError('');
      const response = await fetch(`${API}/exports/non-converted`, {
        headers: { 'Authorization': `Bearer ${session.token}` }
      });
      if (!response.ok) throw new Error('Failed to export non-converted enquiries');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Non_Converted_Enquiries_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setNotice('Non-converted enquiries exported successfully');
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredEnquiries = enquiries.filter(item =>
    `${item.studentName} ${item.enquiryRef} ${item.parentName}`.toLowerCase().includes(search.toLowerCase())
  );
  const filteredApplications = applications.filter(item =>
    `${item.studentName} ${item.applicationRef} ${item.parentName}`.toLowerCase().includes(search.toLowerCase())
  );
  const convertedEnquiries = filteredEnquiries.filter(item => item.status === 'Converted');
  const nonConvertedEnquiries = filteredEnquiries.filter(item => item.status !== 'Converted');

  const field = (form, setForm, name, label, type = 'text', required = true) =>
    <label><span>{label}</span><input type={type} value={form[name]} required={required} onChange={event => setForm({ ...form, [name]: event.target.value })} /></label>;

  const logOut = () => {
    localStorage.removeItem('admissionSession');
    setSession(null);
    setAuthView('staff');
    setMyChild(null);
    setNotice('');
    setError('');
  };

  const getFormattedDate = () => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('en-US', options).toUpperCase();
  };

  if (!session) {
    if (authView === 'parent-login') {
      return <main className="login-page"><section className="login-copy"><p className="eyebrow">SCHOOLMANAGEMENT</p><h1>Admissions portal</h1></section><form className="login-card" onSubmit={parentSignIn}><p className="eyebrow">PARENT PORTAL</p><h2>Sign in</h2>{error && <p className="error">{error}</p>}{field(parentLogin, setParentLogin, 'username', 'Username')}{field(parentLogin, setParentLogin, 'password', 'Password', 'password')}<button className="primary" type="submit">Sign in <span>→</span></button><small>New here? <a href="#register" onClick={e => { e.preventDefault(); setError(''); setAuthView('parent-register'); }}>Register</a> · <a href="#staff" onClick={e => { e.preventDefault(); setError(''); setAuthView('staff'); }}>Staff login</a></small></form></main>;
    }
    if (authView === 'parent-register') {
      return <main className="login-page"><section className="login-copy"><p className="eyebrow">SCHOOLMANAGEMENT</p><h1>Admissions portal</h1></section><form className="login-card" onSubmit={parentRegisterSubmit}><p className="eyebrow">PARENT PORTAL</p><h2>Register</h2>{error && <p className="error">{error}</p>}{field(parentRegister, setParentRegister, 'name', 'Your full name')}{field(parentRegister, setParentRegister, 'username', 'Choose a username')}{field(parentRegister, setParentRegister, 'password', 'Password', 'password')}{field(parentRegister, setParentRegister, 'confirmPassword', 'Confirm password', 'password')}{field(parentRegister, setParentRegister, 'contactNumber', 'Contact number')}{field(parentRegister, setParentRegister, 'email', 'Email', 'email', false)}<button className="primary" type="submit">Create account <span>→</span></button><small>Already registered? <a href="#login" onClick={e => { e.preventDefault(); setError(''); setAuthView('parent-login'); }}>Sign in</a></small></form></main>;
    }
    return <main className="login-page"><section className="login-copy"><p className="eyebrow">SCHOOLMANAGEMENT</p><h1>Admissions portal</h1></section><form className="login-card" onSubmit={signIn}><p className="eyebrow">STAFF PORTAL</p><h2>Sign in</h2>{error && <p className="error">{error}</p>}{field(login, setLogin, 'username', 'Username or full name')}{field(login, setLogin, 'password', 'Password', 'password')}<button className="primary" type="submit">Sign in <span>→</span></button><small>Demo access: admissions01 / test1234</small><small>Parent? <a href="#parent" onClick={e => { e.preventDefault(); setError(''); setAuthView('parent-login'); }}>Sign in here</a></small></form></main>;
  }

  if (session.role === 'Parent') {
    return <div className="shell"><aside><div className="brand"><span className="brand-mark">S</span><div><strong>SchoolManagement</strong><small>Parent portal</small></div></div><div className="aside-bottom"><span className="online"></span><div><strong>{session.name}</strong><small>Parent</small></div><button className="logout" onClick={logOut}>Log out</button></div></aside><main className="workspace"><header><div><p className="eyebrow">{getFormattedDate()}</p><h1>Hey, {session.name.split(' ')[0]}</h1></div></header>{notice && <div className="notice">{notice}</div>}{error && <div className="error banner">{error}</div>}{myChild ? <section className="panel full"><div className="panel-heading"><div><p className="eyebrow">YOUR CHILD</p><h2>{myChild.studentName}</h2></div></div><RecordTable rows={[myChild]} type="enquiries" onStatus={() => {}} readOnly /></section> : <section className="panel form-panel"><p className="eyebrow">NEW ENQUIRY</p><h2>Tell us about your child</h2><form onSubmit={submitChild} className="record-form">{field(childForm, setChildForm, 'studentName', "Child's name")}{field(childForm, setChildForm, 'dob', 'Date of birth', 'date')}<label><span>Gender</span><select value={childForm.gender} onChange={event => setChildForm({ ...childForm, gender: event.target.value })}><option>Male</option><option>Female</option><option>Other</option></select></label>{field(childForm, setChildForm, 'classAppliedFor', 'Class applying for')}{field(childForm, setChildForm, 'address', 'Address', 'text', false)}{field(childForm, setChildForm, 'aadhaarCard', 'Aadhaar card', 'text', false)}<label><span>Source of enquiry</span><select value={childForm.source} onChange={event => setChildForm({ ...childForm, source: event.target.value })}><option value="">Select source</option><option value="Newspaper">Newspaper</option><option value="Billboard">Billboard</option><option value="Website">Website</option><option value="Social Media">Social Media</option><option value="Referral">Referral</option><option value="Walk-in">Walk-in</option><option value="Other">Other</option></select></label><div className="form-actions"><button type="submit" className="primary">Submit enquiry <span>→</span></button></div></form></section>}</main></div>;
  }

  const nav = [['overview', 'Overview'], ['enquiries', 'Enquiries'], ['converted-enquiries', 'Converted'], ['non-converted-enquiries', 'Non-Converted'], ['applications', 'Applications'], ['new-enquiry', 'New enquiry'], ['new-application', 'New application']];
  
  return (
    <div className="shell">
      <aside>
        <div className="brand">
          <span className="brand-mark">S</span>
          <div>
            <strong>SchoolManagement</strong>
            <small>Admissions office</small>
          </div>
        </div>
        <nav>
          {nav.map(([id, label]) => (
            <button
              className={active === id ? 'selected' : ''}
              onClick={() => { setActive(id); setNotice(''); setError(''); }}
              key={id}
            >
              <i>{id === 'overview' ? '⌂' : id === 'enquiries' ? '◌' : id === 'applications' ? '▣' : '+'}</i>
              {label}
            </button>
          ))}
        </nav>
        <div className="aside-bottom">
          <span className="online"></span>
          <div>
            <strong>{session.name}</strong>
            <small>{session.role}</small>
          </div>
          <button className="logout" onClick={logOut}>Log out</button>
        </div>
      </aside>
      <main className="workspace">
        <header>
          <div>
            <p className="eyebrow">{getFormattedDate()}</p>
            <h1>{active === 'overview' ? `Hey, ${session.name.split(' ')[0]}` : nav.find(item => item[0] === active)?.[1]}</h1>
          </div>
          <div className="header-actions">
            <input
              className="search"
              placeholder="Search records..."
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
            <button className="profile">{session.name.charAt(0)}</button>
          </div>
        </header>
        {notice && <div className="notice">{notice}</div>}
        {error && <div className="error banner">{error}</div>}

        {active === 'overview' && (
          <>
            <div className="stats">
              <Stat label="Total enquiries" value={dashboard.enquiries} accent="teal" />
              <Stat label="Applications" value={dashboard.applications} accent="gold" />
              <Stat label="In assessment" value={dashboard.assessments} accent="blue" />
              <Stat label="Admitted" value={dashboard.admitted} accent="coral" />
            </div>
            <section className="content-grid">
              <div className="panel wide">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">PIPELINE</p>
                    <h2>Recent applications</h2>
                  </div>
                  <button className="text-button" onClick={() => setActive('applications')}>View all →</button>
                </div>
                <RecordTable rows={filteredApplications.slice(0, 5)} type="applications" onStatus={updateStatus} />
              </div>
              <div className="panel accent-panel">
                <p className="eyebrow">QUICK ACTIONS</p>
                <h2>Add to pipeline</h2>
                <button className="secondary" onClick={() => setActive('new-enquiry')}>+ New enquiry</button>
                <button className="secondary" onClick={() => setActive('new-application')}>+ New application</button>
              </div>
            </section>
          </>
        )}

        {active === 'enquiries' && (
          <section className="panel full">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">LEAD PIPELINE</p>
                <h2>Enquiries</h2>
              </div>
              <button className="primary compact" onClick={() => setActive('new-enquiry')}>+ New enquiry</button>
            </div>
            <RecordTable rows={filteredEnquiries} type="enquiries" onStatus={updateStatus} />
          </section>
        )}

        {active === 'converted-enquiries' && (
          <section className="panel full">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">CONVERTED LEADS</p>
                <h2>Students Getting Admission</h2>
              </div>
              <button className="primary compact" onClick={exportConverted}>↓ Export to Excel</button>
            </div>
            <RecordTable rows={convertedEnquiries} type="enquiries" onStatus={updateStatus} />
          </section>
        )}

        {active === 'non-converted-enquiries' && (
          <section className="panel full">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">NON-CONVERTED LEADS</p>
                <h2>Follow-up Required</h2>
              </div>
              <button className="primary compact" onClick={exportNonConverted}>↓ Export to Excel</button>
            </div>
            <RecordTable rows={nonConvertedEnquiries} type="enquiries" onStatus={updateStatus} />
          </section>
        )}

        {active === 'applications' && (
          <section className="panel full">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">DECISION PIPELINE</p>
                <h2>Applications</h2>
              </div>
              <button className="primary compact" onClick={() => setActive('new-application')}>+ New application</button>
            </div>
            <RecordTable rows={filteredApplications} type="applications" onStatus={updateStatus} onManage={openApplication} />
            {selectedApplication && <ApplicationWorkflow application={selectedApplication} documents={documents} assessments={assessments} session={session} request={request} refresh={refreshApplication} setNotice={setNotice} setError={setError} />}
          </section>
        )}

        {active === 'new-enquiry' && (
          <FormPanel
            title="Capture an enquiry"
            eyebrow="NEW LEAD"
            onSubmit={event => submit(event, 'enquiry')}
            form={enquiryForm}
            setForm={setEnquiryForm}
            fields={field}
            extra="enquiry"
          />
        )}

        {active === 'new-application' && (
          <FormPanel
            title="Create an application"
            eyebrow="NEW APPLICATION"
            onSubmit={event => submit(event, 'application')}
            form={applicationForm}
            setForm={setApplicationForm}
            fields={field}
            extra="application"
            enquiries={enquiries}
          />
        )}
      </main>
    </div>
  );
}

function RecordTable({ rows, type, onStatus, readOnly = false, onManage }) {
  return rows.length ? (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Reference</th>
            <th>Student</th>
            <th>Class</th>
            <th>Parent contact</th>
            {type === 'enquiries' && <th>Source</th>}
            <th>Aadhaar</th>
            <th>Status</th>
            {onManage && <th>Workflow</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id}>
              <td>
                <strong className="ref">{type === 'enquiries' ? row.enquiryRef : row.applicationRef}</strong>
                <small>{new Date(row.createdAt).toLocaleDateString()}</small>
              </td>
              {onManage && <td><button className="text-button" onClick={() => onManage(row)}>Manage</button></td>}
              <td>
                <strong>{row.studentName}</strong>
                <small>{row.gender} · {new Date(row.dob).toLocaleDateString()}</small>
              </td>
              <td>{row.classAppliedFor}</td>
              <td>
                <strong>{row.parentName}</strong>
                <small>{row.contactNumber}</small>
              </td>
              {type === 'enquiries' && (
                <td>
                  <small>{row.source || '-'}</small>
                </td>
              )}
              <td>{row.aadhaarCard || '-'}</td>
              <td>
                {readOnly ? (
                  <span className={`status ${row.status.toLowerCase()}`}>{row.status}</span>
                ) : (
                  <select
                    className={`status ${row.status.toLowerCase()}`}
                    value={row.status}
                    onChange={event => onStatus(row.id, event.target.value, type)}
                  >
                    {(type === 'enquiries'
                      ? ['New', 'Contacted', 'Converted', 'Closed']
                      : ['Enquiry', 'Assessment', 'Approved', 'Rejected', 'Admitted']
                    ).map(status => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <div className="empty">
      <strong>No records yet</strong>
      <span>New activity will appear here.</span>
    </div>
  );
}

function ApplicationWorkflow({ application, documents, assessments, session, request, refresh, setNotice, setError }) {
  const [documentType, setDocumentType] = useState('Birth Certificate');
  const [file, setFile] = useState(null);
  const [assessment, setAssessment] = useState({ assessmentType: 'Assessment', scheduledAt: '', assessor: '', score: '', result: 'Pending', remarks: '' });
  const [decision, setDecision] = useState('Approved');
  const [reason, setReason] = useState('');
  const run = async action => { try { await action(); setNotice('Workflow updated successfully'); await refresh(); } catch (err) { setError(err.message); } };
  return <section className="panel full workflow-panel">
    <div className="panel-heading"><div><p className="eyebrow">APPLICATION WORKFLOW</p><h2>{application.applicationRef} · {application.studentName}</h2></div><span className={`status ${application.status.toLowerCase()}`}>{application.status}</span></div>
    <div className="content-grid">
      <div><h3>1. Documents</h3><form className="record-form" onSubmit={e => { e.preventDefault(); run(async () => { if (!file) throw new Error('Choose a document file'); const body = new FormData(); body.append('documentType', documentType); body.append('file', file); await request(`/documents/application/${application.id}`, { method: 'POST', body }, session.token); setFile(null); }); }}><label><span>Document type</span><input value={documentType} onChange={e => setDocumentType(e.target.value)} required /></label><label><span>PDF, JPG or PNG (max 5 MB)</span><input type="file" accept="application/pdf,image/jpeg,image/png" onChange={e => setFile(e.target.files[0])} required /></label><button className="secondary" type="submit">Upload document</button></form>{documents.map(doc => <div key={doc.id}><small>{doc.documentType}: {doc.originalName} — {doc.verificationStatus}</small>{doc.verificationStatus === 'Pending' && <><button className="text-button" onClick={() => run(() => request(`/documents/${doc.id}/verification`, { method: 'PATCH', body: JSON.stringify({ verificationStatus: 'Verified' }) }, session.token))}>Verify</button><button className="text-button" onClick={() => { const verificationRemarks = window.prompt('Rejection reason'); if (verificationRemarks) run(() => request(`/documents/${doc.id}/verification`, { method: 'PATCH', body: JSON.stringify({ verificationStatus: 'Rejected', verificationRemarks }) }, session.token)); }}>Reject</button></>}</div>)}</div>
      <div><h3>2. Assessment / Interview</h3>{application.status === 'Documents' && <button className="secondary" onClick={() => run(() => request(`/applications/${application.id}/status`, { method: 'PATCH', body: JSON.stringify({ newStatus: 'Assessment' }) }, session.token))}>Start assessment</button>}{application.status === 'Assessment' && <form className="record-form" onSubmit={e => { e.preventDefault(); run(() => request(`/assessments/application/${application.id}`, { method: 'POST', body: JSON.stringify({ ...assessment, score: assessment.score || null }) }, session.token)); }}><label><span>Type</span><select value={assessment.assessmentType} onChange={e => setAssessment({ ...assessment, assessmentType: e.target.value })}><option>Assessment</option><option>Interview</option></select></label><label><span>Date and time</span><input type="datetime-local" required value={assessment.scheduledAt} onChange={e => setAssessment({ ...assessment, scheduledAt: e.target.value })} /></label><label><span>Assessor</span><input required value={assessment.assessor} onChange={e => setAssessment({ ...assessment, assessor: e.target.value })} /></label><label><span>Result</span><select value={assessment.result} onChange={e => setAssessment({ ...assessment, result: e.target.value })}><option>Pending</option><option>Passed</option><option>Failed</option></select></label><button className="secondary" type="submit">Save assessment</button></form>}{assessments.map(item => <small key={item.id}>{item.assessmentType} · {item.assessor} · {item.result}</small>)}</div>
      <div><h3>3. Decision</h3>{session.role === 'Admin' && application.status === 'Assessment' && <form className="record-form" onSubmit={e => { e.preventDefault(); run(() => request(`/applications/${application.id}/decision`, { method: 'PATCH', body: JSON.stringify({ decision, rejectionReason: reason }) }, session.token)); }}><label><span>Decision</span><select value={decision} onChange={e => setDecision(e.target.value)}><option>Approved</option><option>Rejected</option></select></label>{decision === 'Rejected' && <label><span>Reason</span><input required value={reason} onChange={e => setReason(e.target.value)} /></label>}<button className="primary" type="submit">Save decision</button></form>}{application.status === 'Approved' && <button className="primary" onClick={() => run(() => request(`/applications/${application.id}/status`, { method: 'PATCH', body: JSON.stringify({ newStatus: 'Admitted' }) }, session.token))}>Mark admitted</button>}{application.status === 'Rejected' && <small>Reason: {application.rejectionReason}</small>}</div>
    </div>
  </section>;
}

function FormPanel({ title, eyebrow, onSubmit, form, setForm, fields, extra, enquiries = [] }) {
  return (
    <section className="panel form-panel">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <form onSubmit={onSubmit} className="record-form">
        {extra === 'application' && (
          <label>
            <span>Link an enquiry</span>
            <select
              value={form.enquiryId}
              onChange={event => {
                const enquiry = enquiries.find(item => String(item.id) === event.target.value);
                setForm({
                  ...form,
                  enquiryId: event.target.value,
                  ...(enquiry
                    ? {
                        studentName: enquiry.studentName,
                        dob: enquiry.dob?.slice(0, 10),
                        gender: enquiry.gender,
                        classAppliedFor: enquiry.classAppliedFor,
                        parentName: enquiry.parentName,
                        contactNumber: enquiry.contactNumber
                      }
                    : {})
                });
              }}
            >
              <option value="">Select a converted enquiry</option>
              {enquiries.filter(item => item.status === 'Converted').map(item => (
                <option value={item.id} key={item.id}>
                  {item.enquiryRef} · {item.studentName}
                </option>
              ))}
            </select>
          </label>
        )}
        {fields(form, setForm, 'studentName', 'Student name')}
        {fields(form, setForm, 'dob', 'Date of birth', 'date')}
        <label>
          <span>Gender</span>
          <select
            value={form.gender}
            onChange={event => setForm({ ...form, gender: event.target.value })}
          >
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </select>
        </label>
        {fields(form, setForm, 'classAppliedFor', 'Class applying for')}
        {fields(form, setForm, 'parentName', 'Parent / guardian')}
        {fields(form, setForm, 'contactNumber', 'Contact number')}
        {fields(form, setForm, 'aadhaarCard', 'Aadhaar card', 'text', false)}
        {extra === 'enquiry' ? (
          <>
            {fields(form, setForm, 'email', 'Email', 'email', false)}
            {fields(form, setForm, 'address', 'Address', 'text', false)}
            <label>
              <span>Source of enquiry</span>
              <select
                value={form.source}
                onChange={event => setForm({ ...form, source: event.target.value })}
              >
                <option value="">Select source</option>
                <option value="Newspaper">Newspaper</option>
                <option value="Billboard">Billboard</option>
                <option value="Website">Website</option>
                <option value="Social Media">Social Media</option>
                <option value="Referral">Referral</option>
                <option value="Walk-in">Walk-in</option>
                <option value="Other">Other</option>
              </select>
            </label>
          </>
        ) : (
          fields(form, setForm, 'previousSchool', 'Previous school', 'text', false)
        )}
        <div className="form-actions">
          <button type="submit" className="primary">
            Save record <span>→</span>
          </button>
        </div>
      </form>
    </section>
  );
}

export default App;
