import React from "react";
import { useAuth } from "../../context/AuthContext";
import GrowthTrackDetails from "./GrowthTrackDetails";
import GrowthTrackManagement from "./GrowthTrackManagement";

const GrowthTrack = () => {
  const { user } = useAuth();

  // Route to the appropriate view based on role
  if (user?.role === "employee") {
    return <GrowthTrackDetails />;
  }

  // Admin, superadmin, hr, manager, and hod can manage tracks
  return <GrowthTrackManagement />;
};

export default GrowthTrack;
