import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function SwapRequestToggle() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            // className=""
            // disabled={isDecisionDisabled}
          >
            Decline
          </Button>
        }
      />

      <DropdownMenuContent side="top" align="end" className="w-72">
        <DropdownMenuItem>
          <div className="flex flex-col gap-0.5">
            <span>Decline This Request</span>
            <span className="text-xs text-muted-foreground">
              Only decline this request. Your other requests for this course
              will remain active.
            </span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
