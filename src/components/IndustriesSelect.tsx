import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { industries } from "../assets/data/industries.json";

const selections = industries.map((industry) => ({
  value: industry,
  label: industry,
}));

type IndustriesSelectProps = {
  onValueChange: (value: string) => void;
};

export function IndustriesSelect({ onValueChange }: IndustriesSelectProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[380px] justify-between"
          >
            {value
              ? selections.find((industry) => industry.value === value)?.label
              : "Select occupation..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[380px] p-0">
          <Command>
            <CommandInput placeholder="Search industry..." />
            <CommandEmpty>No industry found.</CommandEmpty>
            <CommandList>
              <CommandGroup>
                {selections.map((industry) => (
                  <CommandItem
                    key={industry.value}
                    value={industry.value}
                    onSelect={(currentValue) => {
                      setValue(currentValue === value ? "" : currentValue);
                      setOpen(false);
                      onValueChange(currentValue);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === industry.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {industry.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
}
