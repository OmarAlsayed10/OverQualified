import { Box, CircularProgress, CssBaseline, ThemeProvider } from "@mui/material";
import { Provider } from "react-redux";
import { createBrowserRouter, Navigate, Outlet, redirect, RouterProvider } from "react-router-dom";
import Error from "./pages/error";
import store from "./redux/store/store";
import Layout from "./pages/layout";
import GetStarted from "./features/GetStart/GetStart";
import { buildTheme } from "./utils/theme";
import { ThemeModeProvider } from "./context/ThemeModeContext";
import { useThemeMode } from "./hooks/useThemeMode";
import "./theme/palette.css";
import Home from "./features/Home/Home";
import LoginPage from "./features/Auth/LoginPage";
import RegisterPage from "./features/Auth/RegisterPage";
import GoogleAuthSuccess from "./features/Auth/GoogleAuthSuccess";
import ForgotPasswordPage from "./features/Auth/ForgotPasswordPage";
import { FileProvider } from "./context/fileContext.jsx";
import ProtectedRoute from "./guard/ProtectedRoute.jsx";
import { useAuth } from "./hooks/useAuth.js";
import "./i18n";
import { useTranslation } from "react-i18next";
import { lazy, Suspense, useEffect, useMemo } from "react";
import { PreviewProvider } from "./context/previewContext.jsx";
import { PricingSection } from "./features/Home/index.ts";
import AdminRoute from "./guard/AdminRoute";
import PaidRoute from "./guard/PaidRoute";
import { FeedbackProvider } from "./context/FeedbackContext";
import { COLORS } from "./theme/tokens";

// Everything past the landing page loads on demand. The builder, PDF export, CV
// analysis and admin dashboard are the bulk of the bundle and most visitors never
// open them, so they must not sit in the first download.
const Builder = lazy(() => import("./features/Builder/Builder"));
const GrammarCheck = lazy(() => import("./features/GrammarCheck/GrammarCheck"));
const CVAnalysisPage = lazy(() => import("./pages/CVAnalysisPage"));
const JobRadarPage = lazy(() => import("./pages/JobRadarPage"));
const ApplicationWorkspacePage = lazy(() => import("./pages/ApplicationWorkspacePage"));
const CareerMatchPage = lazy(() => import("./pages/CareerMatchPage"));
const InterviewCoach = lazy(() => import("./features/InterviewCoach"));
const RoadmapPage = lazy(() => import("./pages/RoadmapPage"));
const ChatBot = lazy(() => import("./features/chatBot/ChatBot"));
const ProPaymentForm = lazy(() => import("./features/payment/Payment"));
const Blog = lazy(() => import("./pages/blogs.jsx"));
const BlogDetail = lazy(() => import("./pages/blogDetails.jsx"));
const PricingPage = lazy(() => import("./pages/PricingPage.tsx"));
const Settings = lazy(() => import("./features/Settings/Settings"));
const OnboardingWizard = lazy(() => import("./features/Onboarding/OnboardingWizard"));
const BuildTypeChooser = lazy(() => import("./features/Create/BuildTypeChooser"));
const ProseDocumentEditor = lazy(() => import("./features/Create/ProseDocumentEditor"));
const TemplatesPage = lazy(() => import("./pages/Templates"));
const PrintCV = lazy(() => import("./pages/PrintCV"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const AdminDashboard = lazy(() => import("./features/admin/AdminDashboard"));

const RouteFallback = () => (
  <Box sx={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
    <CircularProgress sx={{ color: COLORS.primary }} />
  </Box>
);

const ThemedApp = ({ router }: { router: ReturnType<typeof createBrowserRouter> }) => {
  const { mode } = useThemeMode();
  const theme = useMemo(() => buildTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>
  );
};

const FeedbackRouterRoot = () => (
  <FeedbackProvider>
    <Suspense fallback={<RouteFallback />}>
      <Outlet />
    </Suspense>
  </FeedbackProvider>
);

const appRoutes = [
  {
    path: "/",
    element: <Layout />,
    children: [
      { path: "", element: <Home /> },
      {
        path: "builder",
        element: (
          <ProtectedRoute>
            <Builder />
          </ProtectedRoute>
        ),
      },
      {
        path: "getStart",
        element: (
          <ProtectedRoute>
            <GetStarted />
          </ProtectedRoute>
        ),
      },
      {
        path: "onboarding",
        element: (
          <ProtectedRoute>
            <OnboardingWizard />
          </ProtectedRoute>
        ),
      },
      {
        path: "create",
        element: (
          <ProtectedRoute>
            <BuildTypeChooser />
          </ProtectedRoute>
        ),
      },
      {
        path: "documents/new",
        element: (
          <ProtectedRoute>
            <ProseDocumentEditor />
          </ProtectedRoute>
        ),
      },
      { path: "auth/success", element: <GoogleAuthSuccess /> },
      {
        path: "documents/:documentId/edit",
        element: (
          <ProtectedRoute>
            <ProseDocumentEditor />
          </ProtectedRoute>
        ),
      },
      { path: "grammarCheck", element: <GrammarCheck /> },
      { path: "cv-analysis", element: <CVAnalysisPage /> },
      {
        path: "roadmap",
        element: (
          <ProtectedRoute>
            <RoadmapPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "career-match",
        element: (
          <ProtectedRoute>
            <CareerMatchPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "job-radar",
        element: (
          <ProtectedRoute>
            <JobRadarPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "interview-coach",
        element: (
          <ProtectedRoute>
            <InterviewCoach />
          </ProtectedRoute>
        ),
      },
      {
        path: "applications/:matchId",
        element: (
          <ProtectedRoute>
            <ApplicationWorkspacePage />
          </ProtectedRoute>
        ),
      },
      { path: "jobs", element: <Navigate to="/job-radar" replace /> },
      {
        path: "payment-check",
        element: (
          <ProtectedRoute>
            <ProPaymentForm />
          </ProtectedRoute>
        ),
      },
      {
        path: "buy-credits",
        element: (
          <ProtectedRoute>
            <ProPaymentForm purchaseMode="credits" />
          </ProtectedRoute>
        ),
      },
      {
        path: "chatbot",
        element: (
          <ProtectedRoute>
            <ChatBot />
          </ProtectedRoute>
        ),
      },
      { path: "blogs", caseSensitive: true, element: <Blog /> },
      { path: "Blogs", caseSensitive: true, element: <Navigate to="/blogs" replace /> },
      { path: "pricing", element: <PricingPage /> },
      { path: "blogs/:id", caseSensitive: true, element: <BlogDetail /> },
      { path: "Blogs/:id", caseSensitive: true, loader: ({ params }) => redirect(`/blogs/${params.id || ''}`) },
      { path: "*", element: <Error /> },
      { path: "pro-features", caseSensitive: true, element: <PricingSection /> },
      { path: "Pro-Features", caseSensitive: true, element: <Navigate to="/pro-features" replace /> },
      { path: "settings", element: <Settings /> },
      { path: "templates", element: <TemplatesPage /> },
      { path: "help", element: <HelpCenter /> },
      { path: "terms", element: <TermsPage /> },
      { path: "privacy", element: <PrivacyPage /> },
    ],
  },
  { path: "print", element: <PrintCV /> },
  { path: "register", element: <RegisterPage /> },
  { path: "login", element: <LoginPage /> },
  { path: "forgot-password", element: <ForgotPasswordPage /> },
  {
    path: "admin",
    element: (
      <AdminRoute>
        <AdminDashboard />
      </AdminRoute>
    ),
  },
];

const router = createBrowserRouter([
  {
    element: <FeedbackRouterRoot />,
    children: appRoutes,
  },
]);

function App() {
  const { i18n } = useTranslation();
  const { loading } = useAuth();

  useEffect(() => {
    const direction = i18n.language === "ar" ? "rtl" : "ltr";

    document.documentElement.lang = i18n.language;
    document.documentElement.dir = direction;
    document.body.dir = direction;
  }, [i18n.language]);

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress sx={{ color: COLORS.primary }} />
      </Box>
    );
  }
  return (
    <Provider store={store}>
      <PreviewProvider>
        <FileProvider>
          <ThemeModeProvider>
            <ThemedApp router={router} />
          </ThemeModeProvider>
        </FileProvider>
      </PreviewProvider>
    </Provider>
  );
}

export default App;
