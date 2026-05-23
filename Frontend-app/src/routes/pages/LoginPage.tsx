import { LoginForm } from '@/components/auth/LoginForm'

export function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-3 sm:p-4">
      <div className="w-full max-w-sm sm:max-w-md">
        <div className="mb-4 sm:mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold">Admin Records</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">Document & Inventory Management</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
