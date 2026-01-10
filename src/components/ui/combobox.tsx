'use client';

/**
 * Combobox Component
 * A searchable dropdown that supports fuzzy filtering and custom input
 */

import * as React from 'react';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

export interface ComboboxOption {
    value: string;
    label: string;
}

interface ComboboxProps {
    options: ComboboxOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyText?: string;
    allowCustomValue?: boolean;
    loading?: boolean;
    disabled?: boolean;
    className?: string;
}

export function Combobox({
    options,
    value,
    onChange,
    placeholder = 'Select...',
    searchPlaceholder = 'Search...',
    emptyText = 'No results found.',
    allowCustomValue = false,
    loading = false,
    disabled = false,
    className,
}: ComboboxProps) {
    const [open, setOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState('');

    // Find the label for current value
    const selectedOption = options.find((opt) => opt.value === value);
    const displayValue = selectedOption?.label || value || placeholder;

    // Handle selection
    const handleSelect = (selectedValue: string) => {
        onChange(selectedValue);
        setOpen(false);
        setInputValue('');
    };

    // Handle custom input (pressing Enter on non-matching input)
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && allowCustomValue && inputValue) {
            const match = options.find(
                (opt) => opt.value.toLowerCase() === inputValue.toLowerCase()
            );
            if (!match) {
                onChange(inputValue);
                setOpen(false);
                setInputValue('');
            }
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn(
                        'w-full justify-between font-normal',
                        !value && 'text-muted-foreground',
                        className
                    )}
                >
                    <span className="truncate">
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading...
                            </span>
                        ) : (
                            displayValue
                        )}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command shouldFilter={true}>
                    <CommandInput
                        placeholder={searchPlaceholder}
                        value={inputValue}
                        onValueChange={setInputValue}
                        onKeyDown={handleKeyDown}
                    />
                    <CommandList>
                        <CommandEmpty>
                            {allowCustomValue && inputValue ? (
                                <button
                                    className="w-full px-2 py-1.5 text-sm text-left hover:bg-accent rounded"
                                    onClick={() => handleSelect(inputValue)}
                                >
                                    Use &quot;{inputValue}&quot;
                                </button>
                            ) : (
                                emptyText
                            )}
                        </CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.value}
                                    onSelect={() => handleSelect(option.value)}
                                >
                                    <Check
                                        className={cn(
                                            'mr-2 h-4 w-4',
                                            value === option.value ? 'opacity-100' : 'opacity-0'
                                        )}
                                    />
                                    <span className="truncate">{option.label}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
