import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { Settings } from './pages/Settings'
import { ClassList } from './pages/ClassList'
import { ClassDetail } from './pages/ClassDetail'
import { BatchList } from './pages/BatchList'
import { BatchWorkbench } from './pages/BatchWorkbench'
import { BatchReport } from './pages/BatchReport'
import { StudentDetail } from './pages/StudentDetail'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="settings" element={<Settings />} />
        <Route path="classes" element={<ClassList />} />
        <Route path="classes/:classId" element={<ClassDetail />} />
        <Route path="batches" element={<BatchList />} />
        <Route path="batches/:batchId" element={<BatchWorkbench />} />
        <Route path="batches/:batchId/report" element={<BatchReport />} />
        <Route path="students/:studentId" element={<StudentDetail />} />
      </Route>
    </Routes>
  )
}
