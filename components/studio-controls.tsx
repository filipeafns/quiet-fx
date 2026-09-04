'use client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
export function Choice({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (s: string) => void;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value}
      onValueChange={(v) => v && onChange(v)}
      disabled={disabled}
    >
      <SelectTrigger aria-label={label} className="choice">
        <SelectValue>{value}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
export function Range({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  suffix = '%',
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  disabled?: boolean;
}) {
  return (
    <div className="range">
      <div className="range-label">
        <span>{label}</span>
        <output>
          {Number.isInteger(value) ? value : value.toFixed(2)}
          {suffix}
        </output>
      </div>
      <Slider
        aria-label={label}
        value={[value]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
      />
    </div>
  );
}

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
export function Segments({
  label,
  value,
  options,
  onChange,
  className = '',
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <ToggleGroup
      multiple={false}
      value={[value]}
      onValueChange={(v) => {
        if (v[0]) onChange(v[0]);
      }}
      aria-label={label}
      className={'segments ' + className}
      spacing={0}
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option}
          value={option}
          aria-label={option}
          className="segment"
        >
          {option}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
