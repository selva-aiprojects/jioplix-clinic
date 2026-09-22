import React, { InputHTMLAttributes } from 'react';
export interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    onSearch: (query: string) => void;
    debounceMs?: number;
    initialValue?: string;
}
export declare function SearchInput({ onSearch, debounceMs, initialValue, placeholder, className, ...props }: SearchInputProps): React.JSX.Element;
