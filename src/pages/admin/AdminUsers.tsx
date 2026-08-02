import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminUsers() {
  const users = useQuery(api.admin.listAllUsers);
  const setUserAdmin = useMutation(api.admin.setUserAdmin);

  if (!users) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Users</h1>

      {users.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
          No users yet.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user._id}>
                  <TableCell>{user.name || "—"}</TableCell>
                  <TableCell>{user.email || "—"}</TableCell>
                  <TableCell>
                    <Checkbox
                      checked={!!user.isAdmin}
                      onCheckedChange={(checked) =>
                        setUserAdmin({
                          userId: user._id,
                          isAdmin: checked === true,
                        })
                      }
                      aria-label={`Toggle admin for ${user.email || user._id}`}
                    />
                  </TableCell>
                  <TableCell>
                    {user.isAnonymous ? (
                      <Badge variant="outline">Anonymous</Badge>
                    ) : (
                      <Badge variant="secondary">Registered</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(user._creationTime).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
