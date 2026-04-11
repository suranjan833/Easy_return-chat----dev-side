import React, { useState, useEffect } from "react";
import { DropdownToggle, DropdownMenu, Dropdown } from "reactstrap";
import { Icon } from "@/components/Component";
import UserAvatar from "@/components/user/UserAvatar";
import { LinkList, LinkItem } from "@/components/links/Links";
import { useTheme, useThemeUpdate } from "@/layout/provider/Theme";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import chatService from "../../../../Services/ChatService";
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const getRoleName = (roleId) => {
  const roleMap = {
    2: "Administrator",
    1: "Income Tax",
    3: "Agent",
  };
  return roleMap[roleId] || "Unknown Role";
};

const User = () => {
  const theme = useTheme();
  const themeUpdate = useThemeUpdate();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen((prevState) => !prevState);

  const getUserFromStorage = () => {
    try {
      const storedAuth = localStorage.getItem("auth");
      if (storedAuth && storedAuth !== "undefined") {
        const authData = JSON.parse(storedAuth);
        if (authData?.user) {
          // console.log('[User] Loaded user from auth.user:', {
          //   email: authData.user.email,
          //   role_id: authData.user.role_id,
          // });
          return authData.user;
        }
      }
      const storedUser = localStorage.getItem("user");
      if (storedUser && storedUser !== "undefined") {
        const userData = JSON.parse(storedUser);
        return userData;
      }
      console.warn("[User] No user data found in auth or user keys");
      return null;
    } catch (error) {
      console.error("[User] Error parsing user data:", error.message);
      return null;
    }
  };

  const [user, setUser] = useState(getUserFromStorage());

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      console.warn("[User] No access token found");
      toast.error("Please log in to continue.");
      return;
    }

    if (!user || typeof user.role_id === "undefined") {
      const fetchUserData = async () => {
        try {
          const response = await axios.get(`${BASE_URL}/users/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          });
          const userData = {
            ...response.data,
            role_id: response.data.role_id || 3,
          };
          setUser(userData);
          localStorage.setItem("user", JSON.stringify(userData));
          localStorage.setItem(
            "auth",
            JSON.stringify({
              sub: userData.email,
              exp: userData.exp || Math.floor(Date.now() / 1000) + 3600,
              user: userData,
            }),
          );
        } catch (err) {
          console.error("[User] Error fetching user data:", {
            status: err.response?.status,
            message: err.message,
            details: err.response?.data?.detail || "No details",
          });
          toast.error("Failed to load user data.");
        }
      };
      fetchUserData();
    }
  }, []);

  if (!user) {
    return <div>Loading user data...</div>;
  }

  const displayName =
    user.first_name && user.last_name
      ? `${user.first_name} ${user.last_name}`
      : user.name || "User";

  const initials = displayName
    ? displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "US";

  const handleSignOut = async (ev) => {
    ev.preventDefault();
    try {
      const token = localStorage.getItem("accessToken");
      const userId = localStorage.getItem("userId");
      if (token && userId) {
        await axios.get(
          `${BASE_URL}/users/${userId}`,
          { is_active: false },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
          },
        );
        await axios.post(
          `${BASE_URL}/users/logout`,
          {},
          {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
        );
      }
    } catch (err) {
      console.error("[User] Error logging out:", {
        status: err.response?.status,
        message: err.message,
      });
    } finally {
      localStorage.clear();
      chatService.close();
      navigate("/auth-login");
      window.location.reload();
      setOpen(false);
    }
  };

  return (
    <Dropdown isOpen={open} className="user-dropdown" toggle={toggle}>
      <DropdownToggle
        tag="a"
        href="#toggle"
        className="dropdown-toggle"
        onClick={(ev) => ev.preventDefault()}
      >
        <div className="user-toggle">
          <UserAvatar icon="user-alt" className="sm" />
          <div className="user-info d-none d-md-block">
            <div className="user-status">{getRoleName(user.role_id)}</div>
            <div className="user-name dropdown-indicator">{displayName}</div>
          </div>
        </div>
      </DropdownToggle>
      <DropdownMenu end className="dropdown-menu-md dropdown-menu-s1">
        <div className="dropdown-inner user-card-wrap bg-lighter d-none d-md-block">
          <div className="user-card sm">
            <UserAvatar icon="user-alt" className="sm" />
            <div className="user-info">
              <span className="lead-text">{displayName}</span>
              <span className="sub-text">{user.email || "user@email.com"}</span>
            </div>
          </div>
        </div>
        <div className="dropdown-inner">
          <LinkList>
            <LinkItem
              link="/user-profile-regular"
              icon="user-alt"
              onClick={toggle}
            >
              View Profile
            </LinkItem>
            <li>
              <a
                className={`dark-switch ${theme.skin === "dark" ? "active" : ""}`}
                href="#"
                onClick={(ev) => {
                  ev.preventDefault();
                  themeUpdate.skin(theme.skin === "dark" ? "light" : "dark");
                }}
              >
                {theme.skin === "dark" ? (
                  <>
                    <em className="icon ni ni-sun"></em>
                    <span>Light Mode</span>
                  </>
                ) : (
                  <>
                    <em className="icon ni ni-moon"></em>
                    <span>Dark Mode</span>
                  </>
                )}
              </a>
            </li>
          </LinkList>
        </div>
        <div className="dropdown-inner">
          <LinkList>
            <a href="#" onClick={handleSignOut}>
              <Icon name="signout"></Icon>
              <span>Sign Out</span>
            </a>
          </LinkList>
        </div>
      </DropdownMenu>
    </Dropdown>
  );
};

export default User;
