/// <reference types="@sveltejs/kit" />
import type { ApiClient } from '@nftm/sdk';

declare global {
  namespace App {
    interface Locals {
      api: ApiClient;
      session: { address: `0x${string}`; role: 'ADMIN' | 'SUPER_ADMIN' } | null;
    }
    interface PageData {
      session: App.Locals['session'];
    }
  }
}

export {};
