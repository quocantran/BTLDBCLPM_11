import { DatePicker, Input, Select } from "antd";
import type { Dayjs } from "dayjs";
import { SelectOption } from "../atoms/Select/Select.types";

export const SearchFilterType = {
  SEARCH_INPUT: "SEARCH_INPUT",
  DATE_PICKER: "DATE_PICKER",
  SELECT_INPUT: "SELECT_INPUT",
};

const SearchFilter = ({
  type,
  className,
  placeholder,
  options,
  value,
  onChange,
  onEnter,
}: {
  type: string;
  className?: string;
  placeholder?: string;
  options?: SelectOption[];
  value?: string | Dayjs | undefined;
  onChange?: (value: any) => void;
  onEnter?: (value: string) => void;
}) => {
  switch (type) {
    case SearchFilterType.SEARCH_INPUT:
      return (
        <Input
          className={className}
          placeholder={placeholder}
          value={typeof value === "string" ? value : undefined}
          onChange={(e) => onChange?.(e.target.value)}
          onPressEnter={(e) => onEnter?.(e.currentTarget.value)}
        />
      );
    case SearchFilterType.DATE_PICKER:
      return (
        <DatePicker
          className={className}
          value={(value as Dayjs) || undefined}
          onChange={(d) => onChange?.(d || undefined)}
        />
      );
    case SearchFilterType.SELECT_INPUT:
      return (
        <Select
          options={options}
          className={className}
          placeholder={placeholder}
          value={value as string | undefined}
          onChange={(v) => onChange?.(v)}
        />
      );
  }
  return <div>SearchFilter</div>;
};
export default SearchFilter;
