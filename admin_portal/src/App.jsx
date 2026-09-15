import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, ProtectedRoute } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import Unauthorized from "./pages/Unauthorized";
import DataUploadPage from "./pages/DataUploadPage";
import SchoolInfoPage from "./pages/SchoolInfoPage";
import ClassesPage from "./pages/ClassesPage";
import SectionsPage from "./pages/SectionsPage";
import ViewRecordsPage from "./pages/ViewRecordsPage";
import RecordFormPage from "./pages/RecordFormPage";
import TeacherDashboard from "./pages/TeacherDashboard";
import AttendancePage from "./pages/AttendancePage";
import HomeworkPage from "./pages/HomeworkPage";
import TimetablePage from "./pages/TimetablePage";
import MarksPage from "./pages/MarksPage";
import TopPerformerPage from "./pages/TopPerformerPage";
import ManagePasswordsPage from "./pages/ManagePasswordsPage";
import { seedIfEmpty as seedSchoolData } from "./services/schoolDataService";
import { seedIfEmpty as seedSchoolInfo } from "./services/schoolInfoService";
import { seedIfEmpty as seedAcademicStructure } from "./services/academicStructureService";

// Pre-populate the demo (100 students, 20 staff, linked parents, sample
// school profile, classes 1-8 with sections A/B) the first time the app
// loads, so the Admin Portal has something to look at right away instead
// of starting blank.
seedSchoolData();
seedSchoolInfo();
seedAcademicStructure();

// Sprint 1 scope — Administration & Data module (owner: Vishwa)
// Features: sample/dummy data upload, data validation, view uploaded records.
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/school-info"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <SchoolInfoPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/classes"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <ClassesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/sections"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <SectionsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/data-upload"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <DataUploadPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/view-records"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <ViewRecordsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/add-record/:type"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <RecordFormPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/edit-record/:type/:index"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <RecordFormPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/manage-passwords"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <ManagePasswordsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/teacher-dashboard"
            element={
              <ProtectedRoute allowedRoles={["TEACHER"]}>
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/teacher/attendance"
            element={
              <ProtectedRoute allowedRoles={["TEACHER"]}>
                <AttendancePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/teacher/homework"
            element={
              <ProtectedRoute allowedRoles={["TEACHER"]}>
                <HomeworkPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/teacher/timetable"
            element={
              <ProtectedRoute allowedRoles={["TEACHER"]}>
                <TimetablePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/teacher/marks"
            element={
              <ProtectedRoute allowedRoles={["TEACHER"]}>
                <MarksPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/teacher/top-performer"
            element={
              <ProtectedRoute allowedRoles={["TEACHER"]}>
                <TopPerformerPage />
              </ProtectedRoute>
            }
          />

          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
