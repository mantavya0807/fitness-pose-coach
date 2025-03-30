// src/components/ui/skeleton.js
import * as React from "react"; // Import React
import { cn } from "../../lib/utils";

function Skeleton({
  className,
  ...props
}) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props} />
  );
}

export { Skeleton };