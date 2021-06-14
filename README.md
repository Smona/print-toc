# print-toc

Generates a table of contents for a printed HTML document.

### Usage

```ts
import generateTOC from "print-toc";
```

1. Add an element to the page with the id `table-of-contents`.
2. Add a `data-section` attribute to any headings you want to be included.
   If you want a custom section ID, pass it as a value to `data-section`.
3. Call `generateTOC` in the page.

A clickable table of contents will then be inserted into `#table-of-contents`.

### Layout

The script defines some CSS classes for customizing page-break behavior
without breaking page number calculation. These classes can be nested
and used in combination.

- `.page` sets `page-break-inside: avoid;`. Use this on elements
you don't want to be broken apart by page boundaries.
- `.break` sets `page-break-before: always;`. This will force a page
break before the element.

### Requirements

Since we have no way of accessing the print layout from JS-land,
a few requirements must be met to properly compute
page numbers:

- Do not modify the margin or padding of `.break` or `.page` elements.
- Do not define any `page-break-` styles.
  Page-break detection relies on the predefined layout classes.
- Print to an 8.5inx11in page with 0.75in margins. If you need other
  sizes, you'll have to add page width and height calculation to the script.

### Debugging

There is some complexity to determining what page an element will be on with
changing content and styles. There are bound to be some cases where incorrect
page numbers are generated.

Pass `true` as an argument to enable debug mode. This will print more detailed
spacing information in the table of contents, display red dividers at computed
page boundaries, and insert vertical margins in the page to show the page breaks
expected by the script.
