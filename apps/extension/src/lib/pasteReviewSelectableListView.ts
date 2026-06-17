export interface PasteReviewSelectableListItemBase {
  id: string;
  selected: boolean;
}

export interface PasteReviewSelectableListView<TItem extends PasteReviewSelectableListItemBase> {
  emptyMessage?: string;
  items: TItem[];
}

export function createPasteReviewEmptySelectableListView<TItem extends PasteReviewSelectableListItemBase>(
  emptyMessage: string
): PasteReviewSelectableListView<TItem> {
  return {
    emptyMessage,
    items: []
  };
}
