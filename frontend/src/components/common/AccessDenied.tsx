import React from "react";
import { ShieldAlert } from "lucide-react";
import { Card } from "@/components/common";

interface AccessDeniedProps {
  message?: string;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 bg-background">
      <Card className="text-center p-8 max-w-md border border-border shadow-lg rounded-2xl bg-card">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 mx-auto mb-6">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-bold text-foreground">Access Denied</h3>
        <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
          {message || "You do not have the required permissions to view this section. Please contact your organization administrator."}
        </p>
      </Card>
    </div>
  );
};
