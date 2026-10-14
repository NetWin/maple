import { Component } from '@angular/core';

@Component({
  selector: 'maple-badge',
  template: '<ng-content />',
  host: {
    class:
      'rounded-md bg-neutral-100 px-1.5 py-0.5 font-mono text-xs font-medium tracking-wide text-neutral-500 uppercase dark:bg-neutral-800 dark:text-neutral-400'
  }
})
export class Badge {}
