import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Moon, Sun } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session && location.pathname !== "/auth") {
        navigate("/auth");
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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4">
        {/* Header com botões */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Button
            onClick={handleLogout}
            className="bg-danger hover:bg-danger/90 text-danger-foreground w-full py-6 text-base font-medium"
          >
            <LogOut className="mr-2 h-5 w-5" />
            Sair do Usuário
          </Button>
          <Button
            onClick={() => setDarkMode(!darkMode)}
            className="bg-primary hover:bg-primary-dark text-primary-foreground w-full py-6 text-base font-medium"
          >
            {darkMode ? <Sun className="mr-2 h-5 w-5" /> : <Moon className="mr-2 h-5 w-5" />}
            Modo {darkMode ? "Claro" : "Escuro"}
          </Button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-2 gap-3 mb-6">
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
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
  );
};

export default Layout;
