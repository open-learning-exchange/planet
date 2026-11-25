import { NgTemplateOutlet } from '@angular/common';
import {
  Component, ContentChild, DestroyRef, ElementRef, TemplateRef, ViewChild, ViewEncapsulation, afterRenderEffect, effect, input, output,
  signal, viewChild
} from '@angular/core';
import { MatBadge } from '@angular/material/badge';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatChip, MatChipRemove, MatChipSet } from '@angular/material/chips';
import { MatBottomSheet, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatIcon } from '@angular/material/icon';
import { MatToolbar, MatToolbarRow } from '@angular/material/toolbar';
import { DeviceInfoService } from '@shared/ui/device-info.service';

export interface ActiveFilter {
  label: string;
  clear: () => void;
}

export interface SearchCategory {
  label: string;
  options: { label: string, value: string }[];
  chipPrefix?: string;
}

export const searchSelectionFilters = (
  categories: SearchCategory[],
  selection: Record<string, any>,
  change: (event: { category: string, items: string[] }) => void
): ActiveFilter[] => categories.flatMap(({ label: category, options, chipPrefix }) => (selection[category] || []).map((value: string) => {
  const label = options.find(option => option.value === value).label;
  return {
    label: chipPrefix ? `${chipPrefix}: ${label}` : label,
    clear: () => change({ category, items: selection[category].filter((item: string) => item !== value) })
  };
}));

@Component({
  selector: 'planet-list-toolbar',
  templateUrl: './list-toolbar.component.html',
  styleUrls: [ './list-toolbar.component.scss' ],
  encapsulation: ViewEncapsulation.None,
  imports: [
    NgTemplateOutlet, MatBadge, MatButton, MatIconButton, MatChip, MatChipRemove, MatChipSet, MatIcon, MatToolbar, MatToolbarRow
  ]
})
export class ListToolbarComponent {

  static nextId = 0;

  readonly activeFilters = input<ActiveFilter[]>([]);
  readonly searchValue = input('');
  readonly clearFilters = output<void>();
  readonly searchOpen = signal(false);
  readonly searchRowId = `list-toolbar-search-${ListToolbarComponent.nextId++}`;
  private readonly searchRow = viewChild('searchRow', { read: ElementRef });
  @ContentChild('listSearch') searchTemplate: TemplateRef<unknown>;
  @ContentChild('listFilters') filtersTemplate: TemplateRef<unknown>;
  @ViewChild('filtersSheet') filtersSheet: TemplateRef<unknown>;
  readonly compact = this.deviceInfoService.isTabletOrSmaller;
  private sheetRef: MatBottomSheetRef | null = null;

  constructor(
    private deviceInfoService: DeviceInfoService,
    private bottomSheet: MatBottomSheet,
    destroyRef: DestroyRef
  ) {
    effect(() => {
      if (!this.compact()) {
        this.closeFilters();
      }
    });
    destroyRef.onDestroy(() => this.closeFilters());
    // The search row only exists after the next render, so its field gets focus from there
    afterRenderEffect(() => this.searchRow()?.nativeElement.querySelector('input')?.focus());
  }

  openFilters() {
    if (this.sheetRef) {
      return;
    }
    this.sheetRef = this.bottomSheet.open(this.filtersSheet, { panelClass: 'list-filters-sheet', autoFocus: 'dialog' });
    this.sheetRef.afterDismissed().subscribe(() => this.sheetRef = null);
  }

  closeFilters() {
    this.sheetRef?.dismiss();
  }


}
