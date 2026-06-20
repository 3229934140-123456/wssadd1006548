import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import TodayList from "@/pages/TodayList";
import NewFollowUp from "@/pages/NewFollowUp";
import Records from "@/pages/Records";
import TopNav from "@/components/TopNav";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-50 to-white">
        <TopNav />
        <main className="max-w-[1400px] mx-auto px-6 py-6">
          <Routes>
            <Route path="/" element={<TodayList />} />
            <Route path="/new" element={<NewFollowUp />} />
            <Route path="/records" element={<Records />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
