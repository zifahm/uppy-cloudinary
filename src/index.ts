import Uppy from '@uppy/core';
import { ClientProps } from './CloudinaryApiClient';
import CloudinaryPlugin from './CloudinaryPlugin';

export * from './CloudinaryPlugin';

declare module '@uppy/core' {
  export interface Uppy {
    use(pluginClass: typeof CloudinaryPlugin, opts: ClientProps): Uppy.Uppy;
  }
}
