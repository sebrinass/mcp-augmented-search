#!/usr/bin/env node
declare const packageVersion = "0.8.0";
export { packageVersion };
export declare function isWebUrlReadArgs(args: unknown): args is {
    url?: string;
    urls?: string[];
    startChar?: number;
    maxLength?: number;
    section?: string;
    paragraphRange?: string;
    readHeadings?: boolean;
    timeoutMs?: number;
};
