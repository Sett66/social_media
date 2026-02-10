import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUserContext } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader } from "lucide-react";
import { useHandleOAuthCallback } from "@/lib/react-query/queriesAndMutations";

const OAuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { checkAuthUser } = useUserContext();
  const { mutateAsync: handleCallback, isPending } = useHandleOAuthCallback();

  useEffect(() => {
    (async () => {
      try {
        // 先确保有对应的用户文档（没有则自动创建）
        await handleCallback();
        const ok = await checkAuthUser();

        if (ok) {
          toast({ title: "登录成功" });
          navigate("/");
        } else {
          throw new Error("登录失败");
        }
      } catch (e: any) {
        console.error("OAuth 回调处理失败:", e);
        toast({
          title: "登录失败",
          description: e?.message || "请重试",
          variant: "destructive",
        });
        navigate("/sign-in");
      }
    })();
  }, [checkAuthUser, navigate, toast]);

  return (
    <div className="flex-center h-screen">
      <div className="flex flex-col items-center gap-4">
        <Loader className="animate-spin" size={48} />
        <p className="text-lg">正在处理 GitHub 登录...</p>
      </div>
    </div>
  );
};

export default OAuthCallback;