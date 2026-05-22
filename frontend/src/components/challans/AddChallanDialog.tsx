import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { challanService } from "@/services/challanService";
import { formatStatusLabel, TIMELINE_STATUS } from "@/lib/challanStatus";

const schema = z.object({
  challanNumber: z.string().trim().min(3, "Min 3 chars").max(32),
  orderId: z.string().trim().min(3, "Min 3 chars").max(32),
  amount: z.coerce.number().positive("Must be positive").max(10_000_000),
});

type FormValues = z.infer<typeof schema>;

export function AddChallanDialog({
  trigger,
  initialStatus,
}: {
  trigger: React.ReactNode;
  initialStatus?: string;
}) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { challanNumber: "", orderId: "", amount: 1000 },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      challanService.create(values, initialStatus ? { initialStatus } : undefined),
    onSuccess: (c) => {
      toast.success("Challan created", { description: c.challanNumber });
      qc.invalidateQueries({ queryKey: ["challans"] });
      form.reset();
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message ?? "Failed to create challan"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add new challan</DialogTitle>
          <DialogDescription>
            Status will be initialised to{" "}
            <span className="font-medium">
              {initialStatus ? formatStatusLabel(initialStatus) : formatStatusLabel(TIMELINE_STATUS.PAYMENT_INITIATED)}
            </span>{" "}
            with the current timestamp.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          className="space-y-4"
          noValidate
        >
          <div className="grid gap-2">
            <Label htmlFor="challanNumber">Challan number</Label>
            <Input id="challanNumber" placeholder="CH20250001" {...form.register("challanNumber")} />
            {form.formState.errors.challanNumber && (
              <p className="text-xs text-destructive">{form.formState.errors.challanNumber.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="orderId">Order ID</Label>
              <Input id="orderId" placeholder="ORD-000123" {...form.register("orderId")} />
              {form.formState.errors.orderId && (
                <p className="text-xs text-destructive">{form.formState.errors.orderId.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input id="amount" type="number" step="1" {...form.register("amount")} />
              {form.formState.errors.amount && (
                <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create challan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
