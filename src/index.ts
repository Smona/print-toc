const pageHeightPx = 1134;
const pageWidthPx = 754;
let DEBUG = false;

const STYLES = `
  .page, .break {
    padding-top: 1px;
    margin-top: -1px;
  }
  .page {
    position: relative;
    page-break-after: auto;
    page-break-inside: avoid;
    display: block;
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
  return ""
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
  return Array.from(document.querySelectorAll<HTMLElement>(".break, .page")).filter(
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
  const precedingBreaks = getVisibleBreaks().filter((node) =>
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
    ${Array.from(document.querySelectorAll<HTMLElement>("[data-section]"))
      .map((el) => {
        const id =
          el.dataset.section ||
          el.textContent?.toLowerCase().replace(/\s/g, "-");
        
        if (!id) {
          throw new Error("You must provide a section title in the element, or an id in the data-section attribute.")
        }
        
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

export default function generateTOC(debug = false) {
  DEBUG = debug;
  const toc = document.getElementById("table-of-contents");
  if (!toc) return;

  addStyle(STYLES);
  document.body.style.width = `${pageWidthPx}px`;
  drawTOC(toc);

  const pageNumbers = document.querySelectorAll<HTMLElement>(".page-number[data-page]");
  pageNumbers.forEach((element) => {
    const { page } = element.dataset;
    if (typeof page === "undefined") throw new Error("Provide a value to the data-page attribute.")

    const reference = document.getElementById(page);
    if (!reference) throw new Error("Table of contents scaffolding failed.")

    element.textContent = findPageNumber(reference);
  });

  if (DEBUG) {
    drawDebug();
  }
}

