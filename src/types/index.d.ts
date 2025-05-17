declare module 'react' {
  import * as React from 'react';
  export = React;
  export as namespace React;
}

declare module 'next' {
  export interface Metadata {
    title?: string;
    description?: string;
    icons?: {
      icon?: string;
    };
  }
}

declare module 'next/navigation' {
  export function useSearchParams(): {
    get(name: string): string | null;
  } | null;
}

declare module 'next/link' {
  import { ComponentType } from 'react';

  interface LinkProps {
    href: string;
    as?: string;
    replace?: boolean;
    scroll?: boolean;
    shallow?: boolean;
    passHref?: boolean;
    prefetch?: boolean;
    locale?: string | false;
    className?: string;
    children?: React.ReactNode;
  }

  const Link: ComponentType<LinkProps>;
  export default Link;
}

declare module 'next/image' {
  import { ComponentType } from 'react';

  interface ImageProps {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    layout?: 'fixed' | 'intrinsic' | 'responsive' | 'fill';
    objectFit?: 'fill' | 'contain' | 'cover' | 'none' | 'scale-down';
    objectPosition?: string;
    quality?: number;
    priority?: boolean;
    loading?: 'lazy' | 'eager';
    placeholder?: 'blur' | 'empty';
    blurDataURL?: string;
    className?: string;
  }

  const Image: ComponentType<ImageProps>;
  export default Image;
}

declare module '@supabase/supabase-js' {
  export function createClient(supabaseUrl: string, supabaseKey: string): any;
}

declare module 'redis' {
  interface RedisClientOptions {
    url?: string;
    password?: string;
    socket?: {
      reconnectStrategy?: (retries: number) => number;
    };
    [key: string]: any;
  }
  
  export function createClient(options: RedisClientOptions): any;
}

// Add Node.js process environment
declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    NEXT_PUBLIC_SOLANA_RPC_URL: string;
    REDIS_URL: string;
    REDIS_API_KEY: string;
    SUPABASE_JWT_SECRET: string;
  }
} 