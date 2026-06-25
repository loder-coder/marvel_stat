import { isAdminAuthConfigured } from "@/app/admin/auth";
import { loginAdmin } from "@/app/admin/login/actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminLoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const hasError = first(params.error) === "1";
  const configured = isAdminAuthConfigured();

  return (
    <section className="panel admin-login-panel">
      <p className="eyebrow">ADMIN</p>
      <h1>관리자 로그인</h1>
      <p className="updated">Vercel 환경변수에 설정한 ADMIN_SECRET 값을 입력하세요.</p>

      {!configured ? (
        <p className="notice error">ADMIN_SECRET 환경변수가 설정되어 있지 않습니다.</p>
      ) : (
        <form action={loginAdmin} className="admin-login-form">
          <label htmlFor="password">관리자 비밀번호</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" />
          {hasError ? <p className="notice error">비밀번호가 올바르지 않습니다.</p> : null}
          <button type="submit">로그인</button>
        </form>
      )}
    </section>
  );
}
