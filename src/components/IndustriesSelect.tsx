import { industries } from "../assets/data/industries.json";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const IndustriesSelect = ({
  type,
  onValueChange,
}: {
  type: string;
  onValueChange: (value: string) => void;
}) => {
  return (
    <Select defaultValue={type} onValueChange={onValueChange}>
      <SelectTrigger className="mt-2 mb-6">
        <SelectValue placeholder="What is your industry?" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {industries.map((industry) => (
            <SelectItem key={industry} value={industry}>
              {industry}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};
