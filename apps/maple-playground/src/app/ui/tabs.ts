import { Component, input, model } from '@angular/core';

export interface TabOption<T extends string> {
  value: T;
  label: string;
}

let nextId = 0;

/** Radio group styled as a segmented tab strip, with a highlight that slides to the checked option. */
@Component({
  selector: 'maple-tabs',
  templateUrl: './tabs.html'
})
export class Tabs<T extends string> {
  public readonly label = input.required<string>();

  public readonly options = input.required<ReadonlyArray<TabOption<T>>>();

  public readonly value = model.required<T>();

  protected readonly name = `maple-tabs-${nextId++}`;
}
