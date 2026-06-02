export type EditableTarget = HTMLTextAreaElement | HTMLInputElement | HTMLElement;

const blockedInputTypes = new Set(["password", "email", "tel", "number"]);

function looksLikeCreditCardField(input: HTMLInputElement): boolean {
  const joined = [input.name, input.id, input.autocomplete, input.placeholder].join(" ").toLowerCase();
  return /\bcc-|credit|card|cvc|cvv|security-code|expir/.test(joined);
}

function isTextInput(element: Element): element is HTMLInputElement {
  if (!(element instanceof HTMLInputElement)) {
    return false;
  }

  const type = element.type || "text";
  return (type === "text" || type === "search") && !blockedInputTypes.has(type) && !looksLikeCreditCardField(element);
}

function isEditableElement(element: HTMLElement): boolean {
  return element.isContentEditable && element.getAttribute("contenteditable") !== "false";
}

export function findEditableTarget(target: EventTarget | null): EditableTarget | null {
  if (!(target instanceof Element)) {
    return null;
  }

  if (target instanceof HTMLTextAreaElement) {
    return target.disabled || target.readOnly ? null : target;
  }

  if (isTextInput(target)) {
    return target.disabled || target.readOnly ? null : target;
  }

  const editable = target.closest<HTMLElement>('[contenteditable="true"], [contenteditable="plaintext-only"]');
  if (editable && isEditableElement(editable)) {
    return editable;
  }

  return null;
}

function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");

  if (descriptor?.set) {
    descriptor.set.call(element, value);
    return;
  }

  element.value = value;
}

function dispatchInput(element: Element, insertedText: string): void {
  const event = new InputEvent("input", {
    bubbles: true,
    cancelable: false,
    inputType: "insertFromPaste",
    data: insertedText
  });
  element.dispatchEvent(event);
}

export function insertTextAtTarget(target: EditableTarget, text: string, savedRange: Range | null): void {
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? start;
    const nextValue = `${target.value.slice(0, start)}${text}${target.value.slice(end)}`;
    const nextCursor = start + text.length;

    setNativeValue(target, nextValue);
    target.setSelectionRange(nextCursor, nextCursor);
    dispatchInput(target, text);
    return;
  }

  target.focus();
  const selection = window.getSelection();
  const range = savedRange ?? selection?.getRangeAt(0) ?? null;

  if (selection && range) {
    selection.removeAllRanges();
    selection.addRange(range);
    range.deleteContents();
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  } else {
    target.append(document.createTextNode(text));
  }

  dispatchInput(target, text);
}

export function captureCurrentRange(target: EditableTarget): Range | null {
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    return null;
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  return target.contains(range.commonAncestorContainer) ? range.cloneRange() : null;
}
