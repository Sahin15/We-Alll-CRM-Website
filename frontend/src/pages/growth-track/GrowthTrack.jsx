import React from "react";
import { useAuth } from "../../context/AuthContext";
import GrowthTrackDetails from "./GrowthTrackDetails";
import GrowthTrackManagement from "./GrowthTrackManagement";

const MANAGE_FALLBACK_ROLES = ["admin", "superadmin", "hr", "manager", "hod"];

const GrowthTrack = () => {
  const { user, canAccess } = useAuth();

  const canManage =
    canAccess?.("growth_track.manage", MANAGE_FALLBACK_ROLES) ?? false;

  if (!canManage) {
    return <GrowthTrackDetails />;
  }

  return <GrowthTrackManagement />;
};

export default GrowthTrack;
