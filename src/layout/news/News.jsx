import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LogoHeader.css";
import {
  BiTachometer,
  BiUser,
  BiGroup,
  BiLineChart,
  BiCog,
  BiInfoCircle,
} from "react-icons/bi";
import Icon from "@/components/icon/Icon";

const ROLES = {
  ADMIN: 2,
  AGENT: 3,
};

const menu = [
  {
    icon: "BiTachometer",
    text: "Dashboard",
    link: "/",
    isReactIcon: true,
  },
  {
    icon: "bi bi-chat",
    text: "Chat Management",
    link: "/messages",
    allowedRoles: [ROLES.ADMIN],
  },
  {
    icon: "bi bi-briefcase",
    text: "Department Setup",
    link: "/create-department",
    allowedRoles: [ROLES.ADMIN],
  },
  {
    icon: "BiUser",
    text: "User Administration",
    link: "/create-user",
    isReactIcon: true,
    allowedRoles: [ROLES.ADMIN],
  },
  {
    icon: "BiGroup",
    text: "Group Management",
    link: "/app-group-create",
    isReactIcon: true,
    allowedRoles: [ROLES.ADMIN],
  },
  {
    icon: "BiLineChart",
    text: "Performance Analytics",
    link: "/analytics",
    isReactIcon: true,
    allowedRoles: [ROLES.ADMIN, ROLES.AGENT],
  },
  {
    icon: "BiCog",
    text: "System Configuration",
    link: "/shortcuts",
    isReactIcon: true,
    allowedRoles: [ROLES.ADMIN],
  },
  {
    icon: "BiInfoCircle",
    text: "Support Resources",
    link: "/docs",
    isReactIcon: true,
  },
];

const News = () => {
  const navigate = useNavigate();
  const [roleId, setRoleId] = useState(null);

  // 🔐 Read auth in React-safe way
  useEffect(() => {
    const auth = JSON.parse(localStorage.getItem("auth"));
    setRoleId(Number(auth?.user?.role_id));
  }, []);

  // ⛔ Prevent flicker
  if (roleId === null) return null;

  // ✅ ROLE-BASED FILTER
  const filteredMenu = menu.filter((item) => {
    if (roleId === ROLES.ADMIN) return true;       // Admin sees all
    if (!item.allowedRoles) return true;           // Public menu
    return item.allowedRoles.includes(roleId);     // Role match
  });

  return (
    <div className="flex items-center space-x-2">
      {filteredMenu.map((item, index) => (
        <button
          key={index}
          onClick={() => navigate(item.link)}
          className="relative p-2 border-0 bg-transparent"
          aria-label={item.text}
          title={item.text}
        >
          {item.isReactIcon ? (
            <>
              {item.icon === "BiTachometer" && <BiTachometer size="23px" />}
              {item.icon === "BiUser" && <BiUser size="23px" />}
              {item.icon === "BiGroup" && <BiGroup size="23px" />}
              {item.icon === "BiLineChart" && <BiLineChart size="23px" />}
              {item.icon === "BiCog" && <BiCog size="23px" />}
              {item.icon === "BiInfoCircle" && <BiInfoCircle size="23px" />}
            </>
          ) : (
            <Icon
              name={item.icon.replace("bi bi-", "")}
              className="text-xxl text-muted h5 icon-header"
            />
          )}
        </button>
      ))}
    </div>
  );
};

export default News;