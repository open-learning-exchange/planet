import { NgTemplateOutlet } from '@angular/common';
import {
  Component, ContentChild, DestroyRef, TemplateRef, ViewChild, ViewEncapsulation, effect, input, output, signal
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
}

export const searchSelectionFilters = (
  categories: SearchCategory[],
  selection: Record<string, any>,
  change: (event: { category: string, items: string[] }) => void
): ActiveFilter[] => categories.flatMap(({ label: category, options }) => (selection[category] || []).map((value: string) => ({
  label: options.find(option => option.value === value).label,
  clear: () => change({ category, items: selection[category].filter((item: string) => item !== value) })
})));

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

  readonly activeFilters = input<ActiveFilter[]>([]);
  readonly searchValue = input('');
  readonly clearFilters = output<void>();
  readonly searchOpen = signal(false);
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
