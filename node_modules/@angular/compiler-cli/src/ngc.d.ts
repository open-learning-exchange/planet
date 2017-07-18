/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import 'reflect-metadata';
import * as ts from 'typescript';
export declare function readConfiguration(project: string, basePath: string, existingOptions?: ts.CompilerOptions): {
    parsed: ts.ParsedCommandLine;
    ngOptions: any;
};
export declare function main(args: string[], consoleError?: (s: string) => void, files?: string[], options?: ts.CompilerOptions, ngOptions?: any): number;
