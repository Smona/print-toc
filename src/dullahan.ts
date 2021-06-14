const pageHeightPx = 1134;
const pageWidthPx = 754;
let DEBUG = false;

const STYLES = `
  .page, .break {
    padding-top: 1px;
    margin-top: -1px;
  }
  .page {
    page-break-inside: avoid;
  }
  .break {
    page-break-before: always;
  }
  .debug_x {
    height: 1px;
    background: red;
    position: absolute;
    left: 0;     
  }
`;

function comparePosition(a: HTMLElement, b: HTMLElement) {
  const position = a.compareDocumentPosition(b);

  if (position & Node.DOCUMENT_POSITION_FOLLOWING) return "after";
  if (position & Node.DOCUMENT_POSITION_PRECEDING) return "before";
  if (position & Node.DOCUMENT_POSITION_CONTAINS) return "contains";
}

function offset(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const { scrollLeft, scrollTop } = document.body;
  return {
    top: rect.top + scrollTop,
    bottom: rect.bottom + scrollTop,
    left: rect.left + scrollLeft,
    right: rect.right + scrollLeft,
  };
}

function addStyle(styles: string) {
  const css = document.createElement("style");
  css.type = "text/css";
  css.appendChild(document.createTextNode(styles));
  document.getElementsByTagName("head")[0].appendChild(css);
}

function getVisibleBreaks() {
  return Array.from(document.querySelectorAll(".break, .page")).filter(
    (el) => getComputedStyle(el).display !== "none"
  );
}

function getBreakOffset(breakEl: HTMLElement, yOffset = 0) {
  const { className } = breakEl;
  const { top, bottom } = offset(breakEl);
  const offsetTop = yOffset + top;
  const newYOffset = pageHeightPx - (offsetTop % pageHeightPx);
  const isBroken =
    Math.floor(offsetTop / pageHeightPx) !==
    Math.floor((bottom + yOffset) / pageHeightPx);
  if (
    breakEl.className.includes("break") ||
    (className.includes("page") && isBroken)
  ) {
    return newYOffset;
  } else {
    return 0;
  }
}

function findPageNumber(element: HTMLElement): string {
  const precedingBreaks = getVisibleBreaks().filter((node: HTMLElement) =>
    ["before", "contains"].includes(comparePosition(element, node))
  );

  let yOffset = 0;
  for (const breakEl of precedingBreaks) {
    yOffset += getBreakOffset(breakEl as HTMLElement, yOffset);
  }

  const yPosition = offset(element).top + yOffset;
  const pageNum = Math.floor(yPosition / pageHeightPx) + 1;
  if (DEBUG) {
    return `${pageNum} (${precedingBreaks.length} breaks totalling ${Math.round(
      yOffset
    )}px)`;
  }
  return pageNum.toString();
}

function mockBreaks() {
  getVisibleBreaks().forEach((breakEl: HTMLElement) => {
    const { marginTop } = breakEl.style;
    if (!marginTop || marginTop === "-1px") {
      breakEl.style.marginTop = `${getBreakOffset(breakEl)}px`;
    }
  });
}

function drawTOC(element: HTMLElement) {
  element.innerHTML = `
  <ol>
    ${Array.from(document.querySelectorAll("[data-section]"))
      .map((el: HTMLElement) => {
        const id =
          el.dataset.section ||
          el.textContent.toLowerCase().replace(/\s/g, "-");
        el.id = id;
        return `
      <li>
        <a href="#${id}">${el.textContent}</a>
        <span class="page-number" data-page="${id}"></span>
      </li>
    `;
      })
      .join("")}
  </ol>
  `;
}

function drawDebug() {
  mockBreaks();
  const numberOfPages = Math.floor(document.body.scrollHeight / pageHeightPx);
  for (let i = 0; i < numberOfPages; i++) {
    const el = document.createElement("DIV");
    el.style.width = `${pageWidthPx}px`;
    el.style.top = `${(i + 1) * pageHeightPx}px`;
    el.className = "debug_x";
    document.body.appendChild(el);
  }
  window.addEventListener("beforeprint", () => {
    getVisibleBreaks().forEach((breakEl: HTMLElement) => {
      breakEl.style.marginTop = `-1px`;
    });
  });
  window.addEventListener("afterprint", () => {
    mockBreaks();
  });
}

/**
 * Generates a table of contents for a printed document.
 *
 * ### Usage
 *
 * 1. Add an element to the page with the id `table-of-contents`.
 * 2. Add a `data-section` attribute to any headings you want to be included.
 *    If you want a custom section ID, pass it as a value to `data-section`.
 * 3. Call Dullahan in the page.
 *
 * A clickable table of contents will then be inserted into `#table-of-contents`.
 *
 * ### Layout
 *
 * The script defines some CSS classes for customizing page-break behavior
 * without breaking page number calculation. These classes can be nested
 * and used in combination.
 *
 * - `.page` sets `page-break-inside: avoid;`. Use this on elements
 * you don't want to be broken apart by page boundaries.
 * - `.break` sets `page-break-before: always;`. This will force a page
 * break before the element.
 *
 * ### Requirements
 *
 * Since we have no way of accessing the print layout from JS-land,
 * a few requirements must be met for Dullahan to properly compute
 * page numbers:
 *
 * - Do not modify the margin or padding of `.break` or `.page` elements.
 * - Do not define any `page-break-` styles.
 *   Page-break detection relies on the predefined layout classes.
 * - Print to an 8.5inx11in page with 0.75in margins. If you need other
 *   sizes, you'll have to add page width and height calculation to the script.
 *
 * ### Debugging
 *
 * There is some complexity to determining what page an element will be on with
 * changing content and styles. There are bound to be some cases where incorrect
 * page numbers are generated.
 *
 * Pass `true` as an argument to enable debug mode. This will print more detailed
 * spacing information in the table of contents, display red dividers at computed
 * page boundaries, and insert vertical margins in the page to show the page breaks
 * expected by the script.
 *
 * NB: "Dullahan" means [headless horseman](https://en.wikipedia.org/wiki/Dullahan)
 */
export default function Dullahan(debug = false) {
  DEBUG = debug;
  const toc = document.getElementById("table-of-contents");
  if (!toc) return;

  addStyle(STYLES);
  document.body.style.width = `${pageWidthPx}px`;
  drawTOC(toc);

  const pageNumbers = document.querySelectorAll(".page-number[data-page]");
  pageNumbers.forEach((element: HTMLElement) => {
    const { page } = element.dataset;
    const reference = document.getElementById(page);
    element.textContent = findPageNumber(reference);
  });

  if (DEBUG) {
    drawDebug();
  }
}

