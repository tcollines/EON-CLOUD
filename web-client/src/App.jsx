import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Auth from './pages/Auth';
import Billing from './pages/Billing';
import Devices from './pages/Devices';
import Activity from './pages/Activity';
import Settings from './pages/Settings';
import MyFiles from './pages/MyFiles';
import Recent from './pages/Recent';
import FolderView from './pages/FolderView';
import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/devices" element={<Devices />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/files" element={<MyFiles />} />
        <Route path="/recent" element={<Recent />} />
        <Route path="/folder/:folderName" element={<FolderView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
