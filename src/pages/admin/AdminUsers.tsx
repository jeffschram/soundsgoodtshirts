import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function AdminUsers() {
  const users = useQuery(api.admin.listAllUsers);
  const setUserAdmin = useMutation(api.admin.setUserAdmin);

  if (!users) {
    return <div className="loading">Loading users...</div>;
  }

  return (
    <div className="admin-users">
      <h1>Users</h1>

      {users.length === 0 ? (
        <p className="admin-empty">No users yet.</p>
      ) : (
        <div className="admin-table">
          <div className="admin-table-header">
            <span>Name</span>
            <span>Email</span>
            <span>Admin</span>
            <span>Anonymous</span>
            <span>Joined</span>
          </div>
          {users.map((user) => (
            <div key={user._id} className="admin-table-row">
              <span>{user.name || "—"}</span>
              <span>{user.email || "—"}</span>
              <span>
                <button
                  className={`admin-toggle ${user.isAdmin ? "on" : "off"}`}
                  onClick={() =>
                    setUserAdmin({
                      userId: user._id,
                      isAdmin: !user.isAdmin,
                    })
                  }
                >
                  {user.isAdmin ? "Yes" : "No"}
                </button>
              </span>
              <span>{user.isAnonymous ? "Yes" : "No"}</span>
              <span>{new Date(user._creationTime).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
