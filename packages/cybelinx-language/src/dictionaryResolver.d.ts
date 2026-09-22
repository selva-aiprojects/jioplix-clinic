import { EffectiveTermsOptions } from './types.js';
export declare class DictionaryResolver {
    private commonDictionary;
    private domainDictionaries;
    private tenantDictionaries;
    constructor();
    loadCommonDictionary(words: string[]): void;
    loadDomainDictionary(domain: string, words: string[]): void;
    addTenantTerms(tenantId: string, words: string[]): void;
    resolveEffectiveTerms(options?: EffectiveTermsOptions): Set<string>;
}
