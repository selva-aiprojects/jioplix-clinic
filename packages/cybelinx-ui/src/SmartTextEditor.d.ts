import React from 'react';
import { GrammarMatch } from '@cybelinx/language';
export type { GrammarMatch };
export interface SmartTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  domain?: string;
  tenantId?: string;
  placeholder?: string;
  minRows?: number;
  spellCheck?: boolean;
  grammarCheck?: boolean;
  className?: string;
  disabled?: boolean;
}
export declare function SmartTextEditor({ value, onChange, domain, tenantId, placeholder, minRows, spellCheck, grammarCheck, className, disabled, }: SmartTextEditorProps): React.JSX.Element;
