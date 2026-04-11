import React, { useEffect, useLayoutEffect, Fragment, useMemo } from "react";
import Icon from "@/components/icon/Icon";
import classNames from "classnames";
import { NavLink, useLocation } from "react-router-dom";
import { slideUp, slideDown, getParents } from "@/utils/Utils";
import { useThemeUpdate } from "@/layout/provider/Theme";

/**
 * 🔐 ROLE CONFIG
 * Backend aligned:
 * Admin = 2
 * Agent = 3
 */
const ROLE_ID = Number(
  JSON.parse(localStorage.getItem("auth"))?.user?.role_id
);

/**
 * 🔥 Recursive role-based menu filter
 */
const filterMenuByRole = (menu, roleId) => {
  return menu
    .filter((item) => {
      if (item.heading) return true;

      // 🔥 ADMIN OVERRIDE
      if (roleId === 2) return true;

      if (!item.allowedRoles) return true;
      return item.allowedRoles.includes(roleId);
    })
    .map((item) => {
      if (item.subMenu) {
        return {
          ...item,
          subMenu: filterMenuByRole(item.subMenu, roleId),
        };
      }
      return item;
    })
    .filter(
      (item) => !item.subMenu || item.subMenu.length > 0
    );
};

const Menu = ({ data = [] }) => {
  const themeUpdate = useThemeUpdate();
  const location = useLocation();

  // ✅ Filter menu ONCE (memoized)
  const filteredData = useMemo(
    () => filterMenuByRole(data, ROLE_ID),
    [data]
  );

  /* =========================
     ACTIVE LINK HANDLING
  ========================== */
  const currentLink = (selector) => {
    let elm = document.querySelectorAll(selector);
    elm.forEach((item) => {
      const isActive = item.classList.contains("active");
      if (isActive) {
        let parents = getParents(item, `.nk-menu`, "nk-menu-item");
        parents.forEach((parent) => {
          parent.classList.add("active", "current-page");
          let subItem = parent.querySelector(`.nk-menu-wrap`);
          subItem && (subItem.style.display = "block");
        });
      } else {
        item.parentElement?.classList.remove("active", "current-page");
      }
    });
  };

  const dropdownToggle = (elm) => {
    let parent = elm.parentElement;
    let nextelm = elm.nextElementSibling;
    let speed =
      nextelm.children.length > 5
        ? 400 + nextelm.children.length * 10
        : 400;

    if (!parent.classList.contains("active")) {
      parent.classList.add("active");
      slideDown(nextelm, speed);
    } else {
      parent.classList.remove("active");
      slideUp(nextelm, speed);
    }
  };

  const closeSiblings = (elm) => {
    let parent = elm.parentElement;
    let siblings = parent.parentElement.children;
    Array.from(siblings).forEach((item) => {
      if (item !== parent) {
        item.classList.remove("active");
        if (item.classList.contains("has-sub")) {
          let subitem = item.querySelectorAll(`.nk-menu-wrap`);
          subitem.forEach((child) => {
            child.parentElement.classList.remove("active");
            slideUp(child, 400);
          });
        }
      }
    });
  };

  const menuToggle = (e) => {
    e.preventDefault();
    let item = e.target.closest(`.nk-menu-toggle`);
    dropdownToggle(item);
    closeSiblings(item);
  };

  useLayoutEffect(() => {
    currentLink(`.nk-menu-link`);
    themeUpdate.sidebarHide();
  }, [location.pathname]);

  useEffect(() => {
    currentLink(`.nk-menu-link`);
    // eslint-disable-next-line
  }, []);

  /* =========================
     RENDER
  ========================== */
  return (
    <ul className="nk-menu">
      {filteredData.map((item, index) => (
        <Fragment key={index}>
          {item.heading ? (
            <li className="nk-menu-heading">
              <h6 className="overline-title text-primary-alt">
                {item.heading}
              </h6>
            </li>
          ) : (
            <li
              className={classNames({
                "nk-menu-item": true,
                "has-sub": item.subMenu,
              })}
            >
              {!item.subMenu ? (
                <NavLink
                  to={item.link}
                  className="nk-menu-link"
                  target={item.newTab ? "_blank" : undefined}
                >
                  {item.icon && (
                    <span className="nk-menu-icon">
                      <Icon name={item.icon} />
                    </span>
                  )}
                  <span className="nk-menu-text">{item.text}</span>
                  {item.badge && (
                    <span className="nk-menu-badge">{item.badge}</span>
                  )}
                </NavLink>
              ) : (
                <>
                  <a
                    href="#"
                    className="nk-menu-link nk-menu-toggle"
                    onClick={menuToggle}
                  >
                    {item.icon && (
                      <span className="nk-menu-icon">
                        <Icon name={item.icon} />
                      </span>
                    )}
                    <span className="nk-menu-text">{item.text}</span>
                    {item.badge && (
                      <span className="nk-menu-badge">{item.badge}</span>
                    )}
                  </a>
                  <div className="nk-menu-wrap">
                    <ul className="nk-menu-sub">
                      {item.subMenu.map((sItem, sIndex) => (
                        <li
                          className={classNames({
                            "nk-menu-item": true,
                            "has-sub": sItem.subMenu,
                          })}
                          key={sIndex}
                        >
                          {!sItem.subMenu ? (
                            <NavLink
                              to={sItem.link}
                              className="nk-menu-link"
                            >
                              <span className="nk-menu-text">
                                {sItem.text}
                              </span>
                              {sItem.badge && (
                                <span className="nk-menu-badge">
                                  {sItem.badge}
                                </span>
                              )}
                            </NavLink>
                          ) : (
                            <>
                              <a
                                href="#"
                                className="nk-menu-link nk-menu-toggle"
                                onClick={menuToggle}
                              >
                                <span className="nk-menu-text">
                                  {sItem.text}
                                </span>
                              </a>
                              <div className="nk-menu-wrap">
                                <ul className="nk-menu-sub">
                                  {sItem.subMenu.map((s2, i2) => (
                                    <li
                                      className="nk-menu-item"
                                      key={i2}
                                    >
                                      <NavLink
                                        to={s2.link}
                                        className="nk-menu-link"
                                      >
                                        <span className="nk-menu-text">
                                          {s2.text}
                                        </span>
                                      </NavLink>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </li>
          )}
        </Fragment>
      ))}
    </ul>
  );
};

export default Menu;