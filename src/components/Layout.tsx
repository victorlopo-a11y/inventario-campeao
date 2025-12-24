import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Moon, Sun } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RealtimeNotifications } from "@/components/RealtimeNotifications";
import { useUserRole } from "@/hooks/useUserRole";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { canEdit } = useUserRole();
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    const storedTheme = window.localStorage.getItem("theme");
    if (storedTheme === "dark") {
      return true;
    }
    if (storedTheme === "light") {
      return false;
    }

    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });
  const [currentUserName, setCurrentUserName] = useState<string>("");

  const setNameFromSession = (session: any) => {
    const metadata = session?.user?.user_metadata || {};
    const derivedName =
      metadata.full_name ||
      metadata.name ||
      metadata.fullName ||
      session?.user?.email ||
      "";
    setCurrentUserName(derivedName);
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      } else {
        setNameFromSession(session);
      }
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session && location.pathname !== "/auth") {
        navigate("/auth");
      } else if (session) {
        setNameFromSession(session);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem("theme", darkMode ? "dark" : "light");
    }
  }, [darkMode]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
    navigate("/auth");
  };

  const isTrackingPage = location.pathname === "/";
  const isInventoryPage = location.pathname === "/inventario";
  const isReportsPage = location.pathname === "/relatorios";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4">
        {currentUserName && (
          <div className="mb-2 text-right text-sm font-medium text-foreground print-hide">
            Olá, {currentUserName}
          </div>
        )}
        {/* Header com botões */}
        <div className="grid grid-cols-2 gap-3 mb-4 print-hide">
          <Button
            onClick={handleLogout}
            className="bg-danger hover:bg-danger/90 text-danger-foreground w-full py-6 text-base font-medium"
          >
            <LogOut className="mr-2 h-5 w-5" />
            Sair do Usuário
          </Button>
          <div className="flex gap-2">
            {canEdit && <RealtimeNotifications />}
            <Button
              onClick={() => setDarkMode(!darkMode)}
              className="bg-primary hover:bg-primary-dark text-primary-foreground flex-1 py-6 text-base font-medium"
            >
              {darkMode ? <Sun className="mr-2 h-5 w-5" /> : <Moon className="mr-2 h-5 w-5" />}
              Modo {darkMode ? "Claro" : "Escuro"}
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 gap-3 mb-6 print-hide">
          <Button
            onClick={() => navigate("/")}
            variant={isTrackingPage ? "default" : "secondary"}
            className="w-full py-6 text-base font-medium"
          >
            Rastreamento
          </Button>
          <Button
            onClick={() => navigate("/inventario")}
            variant={isInventoryPage ? "default" : "secondary"}
            className="w-full py-6 text-base font-medium"
          >
            Inventário
          </Button>
          <Button
            onClick={() => navigate("/relatorios")}
            variant={isReportsPage ? "default" : "secondary"}
            className="w-full py-6 text-base font-medium"
          >
            Relatórios
          </Button>
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
  );
};

export default Layout;

