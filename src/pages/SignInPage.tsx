import { SignInForm } from "../SignInForm";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Navigate } from "react-router-dom";

export default function SignInPage() {
  const user = useQuery(api.auth.loggedInUser);

  // If user is already signed in, redirect to account page
  if (user) {
    return <Navigate to="/my-account" replace />;
  }

  return (
    <div className="sign-in-page">
      <div className="container">
        <div className="sign-in-container">
          <h1>Sign In to Your Account</h1>
          <p className="sign-in-description">
            Sign in to view your order history and manage your account.
          </p>
          <SignInForm />
        </div>
      </div>
    </div>
  );
}
