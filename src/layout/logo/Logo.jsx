import React from "react";
import LogoLight2x from "@/images/Easy return logo png.png";
// import LogoDark2x from "@/images/logo-dark2x.png";
import {Link} from "react-router-dom";

const Logo = () => {
  return (
    <Link to={`/analytics`} className="logo-link">
      <img className="logo-light logo-img" src={LogoLight2x} alt="logo" />
    </Link>
  );
};

export default Logo;
