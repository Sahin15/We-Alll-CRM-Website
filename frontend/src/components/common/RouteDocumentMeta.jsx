import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { applyRouteDocumentMeta } from "../../utils/documentMeta";

/**
 * Updates document title and meta tags on route changes.
 * Login/public routes use indexable meta; authenticated routes keep noindex.
 */
const RouteDocumentMeta = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    applyRouteDocumentMeta(pathname);
  }, [pathname]);

  return null;
};

export default RouteDocumentMeta;
