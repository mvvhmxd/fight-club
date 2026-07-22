import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import FightClubLayout from "./components/FightClubLayout";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import Curriculum from "./pages/Curriculum";
import TopicDetail from "./pages/TopicDetail";
import MyReviews from "./pages/MyReviews";
import Progress from "./pages/Progress";
import Leaderboard from "./pages/Leaderboard";
import Members from "./pages/Members";
import Profile from "./pages/Profile";
import AdminMembers from "./pages/admin/AdminMembers";
import AdminCurriculum from "./pages/admin/AdminCurriculum";
import AdminTasks from "./pages/admin/AdminTasks";
import AdminBlocked from "./pages/admin/AdminBlocked";

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/dashboard">
        <FightClubLayout>
          <Dashboard />
        </FightClubLayout>
      </Route>
      <Route path="/curriculum">
        <FightClubLayout>
          <Curriculum />
        </FightClubLayout>
      </Route>
      <Route path="/curriculum/:topicId">
        {(params) => (
          <FightClubLayout>
            <TopicDetail topicId={params.topicId} />
          </FightClubLayout>
        )}
      </Route>
      <Route path="/reviews">
        <FightClubLayout>
          <MyReviews />
        </FightClubLayout>
      </Route>
      <Route path="/progress">
        <FightClubLayout>
          <Progress />
        </FightClubLayout>
      </Route>
      <Route path="/leaderboard">
        <FightClubLayout>
          <Leaderboard />
        </FightClubLayout>
      </Route>
      <Route path="/members">
        <FightClubLayout>
          <Members />
        </FightClubLayout>
      </Route>
      <Route path="/profile/:userId">
        {(params) => (
          <FightClubLayout>
            <Profile userId={parseInt(params.userId)} />
          </FightClubLayout>
        )}
      </Route>
      {/* Admin routes */}
      <Route path="/admin/members">
        <FightClubLayout>
          <AdminMembers />
        </FightClubLayout>
      </Route>
      <Route path="/admin/curriculum">
        <FightClubLayout>
          <AdminCurriculum />
        </FightClubLayout>
      </Route>
      <Route path="/admin/tasks">
        <FightClubLayout>
          <AdminTasks />
        </FightClubLayout>
      </Route>
      <Route path="/admin/blocked">
        <FightClubLayout>
          <AdminBlocked />
        </FightClubLayout>
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster theme="dark" position="bottom-right" />
          <AppRoutes />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
