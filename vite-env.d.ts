declare module '*.svg' {
  import * as React from 'react';
  export const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement> & { title?: string }>;
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.json' {
  const content: string;
  export default content;
}

declare module '*.css';

// Augment the global JSX namespace to include standard HTML elements and Three.js elements.
// Using a permissive index signature allows all element tags (div, span, mesh, etc.) 
// which fixes the 'Property does not exist on type JSX.IntrinsicElements' errors.
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

// Augment React's JSX namespace for React 18+ / TS 5+
import 'react';
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

// Ensure this file is treated as a module
export {};