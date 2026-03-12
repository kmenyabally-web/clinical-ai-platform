import { useRole } from "../context/RoleContext";

/**
 * Renders children only when the user has the given permission.
 * Renders nothing while role is loading to avoid flicker.
 *
 * @example
 * <Can permission="audit:delete">
 *   <DeleteButton />
 * </Can>
 */
export default function Can({ permission, children }) {
  const { can, loading } = useRole();

  if (loading || !permission || !can(permission)) {
    return null;
  }

  return children;
}
