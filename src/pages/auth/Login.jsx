import {
  Block,
  BlockContent,
  BlockDes,
  BlockHead,
  BlockTitle,
  Button,
  Icon,
  PreviewCard,
} from "@/components/Component";
import LogoDark from "@/images/Easy return logo png.png";
import Logo from "@/images/logo.png";
import Head from "@/layout/head/Head";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import axios from "axios";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { Alert, Form, Spinner } from "reactstrap";
import { loginUser } from "../../Services/api.js";
import AuthFooter from "./AuthFooter";
const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://chatsupport.fskindia.com";
const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "634574657956-5amad98bvuo5k3f3ueudq7rlebhuvm80.apps.googleusercontent.com"; // Replace with your actual Google Client ID

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [passState, setPassState] = useState(false);
  const [errorVal, setError] = useState("");
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onFormSubmit = async (formData) => {
    setLoading(true);
    setError("");

    try {
      const data = await loginUser(formData, { withCredentials: true });
      if (!data.profile?.id && !data.profile?.user_id) {
        throw new Error("Invalid user ID in profile response");
      }
      const userId = data.profile.id || data.profile.user_id;
      const userEmail = data.profile.email || formData.email;
      const user = {
        id: userId,
        email: userEmail,
        name:
          data.profile.first_name ||
          data.profile.name ||
          formData.email.split("@")[0],
        role_id: data.profile.role_id || 3,
        first_name: data.profile.first_name || "",
        last_name: data.profile.last_name || "",
      };

      // Update is_active to true on login
      const token = data.access_token;
      await axios.get(
        `${BASE_URL}/users/${userId}`,
        { is_active: true },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        },
      );

      localStorage.setItem("accessToken", token);
      localStorage.setItem("userId", userId.toString());
      localStorage.setItem("userEmail", userEmail);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem(
        "auth",
        JSON.stringify({
          sub: userEmail,
          exp: Math.floor(Date.now() / 1000) + 3600,
          user,
        }),
      );
      navigate("/analytics", { replace: true });
      window.location.reload();
    } catch (error) {
      const message = error.message || "Invalid credentials. Please try again.";
      setError(message);
      console.error("[Login] Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLoginSuccess = async (credentialResponse) => {
    setLoading(true);
    setError("");

    // Here you would send credentialResponse.credential to your backend for verification
    // and then handle the backend's response (e.g., set user in localStorage, navigate).
    // For now, we'll just log and stop loading.
    setLoading(false);
  };

  return (
    <>
      <Head title="Login" />
      <Block className="nk-block-middle nk-auth-body wide-xs">
        <div className="brand-logo pb-4 text-center">
          <Link to={"/"} className="logo-link">
            <img
              className="logo-light logo-img logo-img-lg"
              src={Logo}
              alt="logo"
            />
            <img
              className="logo-dark logo-img logo-img-lg"
              src={LogoDark}
              alt="logo-dark"
            />
          </Link>
        </div>

        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <PreviewCard className="card-bordered" bodyClass="card-inner-lg">
            <BlockHead>
              <BlockContent>
                <BlockTitle tag="h4">Sign-In</BlockTitle>
                <BlockDes>
                  <p>Access your account using your email and password.</p>
                </BlockDes>
              </BlockContent>
            </BlockHead>

            {errorVal && (
              <div className="mb-3">
                <Alert color="danger" className="alert-icon">
                  <Icon name="alert-circle" /> {errorVal}
                </Alert>
              </div>
            )}

            <Form className="is-alter" onSubmit={handleSubmit(onFormSubmit)}>
              <div className="form-group">
                <div className="form-label-group">
                  <label className="form-label" htmlFor="email">
                    Email Address
                  </label>
                </div>
                <div className="form-control-wrap">
                  <input
                    type="email"
                    id="email"
                    {...register("email", {
                      required: "Email is required",
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "Invalid email address",
                      },
                    })}
                    placeholder="Enter your email address"
                    className="form-control-lg form-control"
                  />
                  {errors.email && (
                    <span className="invalid">{errors.email.message}</span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <div className="form-label-group">
                  <label className="form-label" htmlFor="password">
                    Password
                  </label>
                  <Link
                    className="link link-primary link-sm"
                    to={`/auth-reset`}
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="form-control-wrap">
                  <a
                    href="#password"
                    onClick={(ev) => {
                      ev.preventDefault();
                      setPassState(!passState);
                    }}
                    className={`form-icon lg form-icon-right passcode-switch ${passState ? "is-hidden" : "is-shown"}`}
                  >
                    <Icon name="eye" className="passcode-icon icon-show"></Icon>
                    <Icon
                      name="eye-off"
                      className="passcode-icon icon-hide"
                    ></Icon>
                  </a>
                  <input
                    type={passState ? "text" : "password"}
                    id="password"
                    {...register("password", {
                      required: "Password is required",
                      minLength: {
                        value: 6,
                        message: "Password must be at least 6 characters",
                      },
                    })}
                    placeholder="Enter your password"
                    className={`form-control-lg form-control ${passState ? "is-hidden" : "is-shown"}`}
                  />
                  {errors.password && (
                    <span className="invalid">{errors.password.message}</span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <Button
                  size="lg"
                  className="btn-block"
                  type="submit"
                  color="primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Spinner size="sm" color="light" /> Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </div>
            </Form>

            <div className="form-note-s2 text-center pt-4">
              {/* New on our platform?{" "} */}
              {/* <Link to={`/auth-register`}>Create an account</Link> */}
            </div>

            <div className="text-center pt-4 pb-3">
              {/* <h6 className="overline-title overline-title-sap"> */}
              {/* <span>OR</span> */}
              {/* </h6> */}
            </div>

            {/* <ul className="nav justify-center gx-4">
              <li className="nav-item">
                <a className="nav-link" href="#socials" onClick={(ev) => ev.preventDefault()}>
                  <Icon name="facebook-f" />
                </a>
              </li>
              <li className="nav-item">
                <GoogleLogin
                  onSuccess={handleGoogleLoginSuccess}
                  onError={() => console.log("Google Login Failed")}
                />
              </li>
            </ul> */}
          </PreviewCard>
        </GoogleOAuthProvider>
      </Block>
      <AuthFooter />
    </>
  );
};

export default Login;
