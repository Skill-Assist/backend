import { BadRequestException } from "@nestjs/common";
import { GradingCriteria } from "./api-types.utils";
////////////////////////////////////////////////////////////////////////////////

/**
 * ============================================================================
 * Type definitions for the NLP API.
 * ============================================================================
 */

export type TSuccess<T> = {
  success: true;
  data: T;
};

export type TError = {
  success: false;
  message: string;
};

export type TResult<T> = TSuccess<T> | TError;

export function success<T>(data: T): TSuccess<T> {
  return { success: true, data };
}

export function error(message: string): TError {
  return { success: false, message };
}

export function getData<T>(result: TResult<T>) {
  if (result.success) {
    return result.data;
  }
  throw new BadRequestException(result.message);
}

/**
 * ============================================================================
 * Interface definitions for the NLP API.
 * ============================================================================
 */

export interface ILanguageModel {
  retryMaxAttempts?: number;
  retryPauseMs?: number;
  complete(
    prompt: string,
    mode: string,
    schema: string
  ): Promise<TResult<string>>;
}

export interface IJsonValidator<T extends object> {
  schema: string;
  typeName: string;
  stripNulls: boolean;
  createModuleTextFromJson(jsonObject: object): TResult<string>;
  validate(jsonText: string): TResult<T>;
}

export interface IJsonTranslator<T extends object> {
  model: ILanguageModel;
  validator: IJsonValidator<T>;
  attemptRepair: boolean;
  stripNulls: boolean;
  createRequestPrompt(
    request: string,
    mode: "create" | "eval",
    statement?: string,
    criteria?: GradingCriteria
  ): string;
  translate(
    request: string,
    mode: "create" | "eval",
    statement?: string,
    criteria?: GradingCriteria
  ): Promise<TResult<T>>;
}

/**
 * ============================================================================
 * Helper functions for the NLP API.
 * ============================================================================
 */

export function isTransientHttpError(code: number): boolean {
  switch (code) {
    case 429: // TooManyRequests
    case 500: // InternalServerError
    case 502: // BadGateway
    case 503: // ServiceUnavailable
    case 504: // GatewayTimeout
      return true;
  }
  return false;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function stripNulls(obj: any) {
  let keysToDelete: string[] | undefined;
  for (const k in obj) {
    const value = obj[k];
    if (value === null) {
      (keysToDelete ??= []).push(k);
    } else {
      if (Array.isArray(value)) {
        if (value.some((x) => x === null)) {
          obj[k] = value.filter((x) => x !== null);
        }
      }
      if (typeof value === "object") {
        stripNulls(value);
      }
    }
  }
  if (keysToDelete) {
    for (const k of keysToDelete) {
      delete obj[k];
    }
  }
}

/**
 * ============================================================================
 * Constants for the NLP API.
 * ============================================================================
 */

export const libText = `
interface Array<T> { length: number, [n: number]: T }
interface Object { toString(): string }
interface Function { prototype: unknown }
interface CallableFunction extends Function {}
interface NewableFunction extends Function {}
interface String { readonly length: number }
interface Boolean { valueOf(): boolean }
interface Number { valueOf(): number }
interface RegExp { test(s: string): boolean }`;

// =============================================================================
