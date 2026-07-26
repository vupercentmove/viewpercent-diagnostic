"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const { error: msg } = await res.json();
        setError(msg ?? "오류가 발생했습니다.");
        return;
      }
      router.push("/admin/dashboard");
    } catch {
      setError("서버 연결 오류");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-1">뷰퍼센트 어드민</h1>
        <p className="text-sm text-gray-500 mb-6">브랜드 진단 관리자 페이지</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            autoFocus
            aria-label="비밀번호"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "login-error" : undefined}
            className="w-full border border-gray-500 rounded-lg px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-vp-blue focus-visible:ring-offset-2"
          />
          {error && (
            <p id="login-error" role="alert" className="text-sm text-vp-risk">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="bg-vp-navy text-white rounded-lg py-3 text-sm font-medium disabled:opacity-50 transition-opacity"
          >
            {loading ? "확인 중..." : "로그인"}
          </button>
        </form>
      </div>
    </div>
  );
}
