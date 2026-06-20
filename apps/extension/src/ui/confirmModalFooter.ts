import type { ConfirmModalFooterState } from "./confirmModalState";

export interface ConfirmModalFooterElements {
  submitButton: HTMLButtonElement;
}

export function applyConfirmModalFooterState(
  elements: ConfirmModalFooterElements,
  state: ConfirmModalFooterState
): void {
  elements.submitButton.textContent = state.submitButtonText;
  elements.submitButton.toggleAttribute("disabled", state.submitButtonDisabled);
}
