/*

  ===== Info about this file =====

  " This is the main TS/JS file for NodeCMS admin-panel

  Author: Iannis de Zwart (https://github.com/iannisdezwart)

  ===== Table of contents =====

  1. On-load setup

  2. Common Types and Functions
    2.1 Common Types
    2.2 Common Functions

  3. Page Manager
    3.1 Show Pages
      3.1.1 Swap Pages
    3.2 Edit Page
      3.2.1 Save Page
    3.3 Add Page
    3.4 Delete Page
    3.5 Page Template Input To HTML
      3.5.1 Generate .img-array-img Element
      3.5.2 Edit Video Path
    3.6 Collect Page Template Inputs
    3.7 img[] Functions
      3.7.1 Move Image
      3.7.2 Edit Image
      3.7.3 Delete Image
      3.7.4 Add Image
    3.8 Element Group Functions
      3.8.1 Move Group
      3.8.2 Delete Group
      3.8.3 Add Group

  4. File Manager
    4.1 Upload Files
    4.2 Drop Area
    4.3 File Picker
      4.3.1 Create UL from files
        4.3.1.1 li.file-list-item hover animation
        4.3.1.2 li.file-list-item select handler
        4.3.1.3 Expand directory
      4.3.2 Handle submit button click
    4.4 Show Files
      4.4.1 Bulk Delete Files
      4.4.2 Bulk Copy Files
      4.4.3 Bulk Move Files
    4.5 Delete File
    4.6 Copy File and Move File
      4.6.1 Copy / Move File With Different Name
    4.7 Rename File
    4.8 Create New Directory

  5. Database manager
    For now, this is unavailable. Might reimplement it in the future.

  6. User Management
    6.1 Fetch Users
    6.2 Show User Management Panel
    6.3 Change User's Password
    6.4 Delete user
    6.5 Add User
*/

/* ===================
  1. On-load setup
=================== */

window.onload = async () => {
  const username = localStorage.getItem("username");

  goToTheRightPage();
  initPadlock();

  if (username === null) {
    await login();
  }

  // Set the greeting.
  const greetingLI = $<HTMLLIElement>("#greeting");
  greetingLI.innerText = `Welcome, ${localStorage.getItem("username")}!`;
};

/* ===================
  2. Common Types and Functions
=================== */

type PageTypeKind = "list" | "single" | "virtual";
type PageType = {
  id: number;
  name: string;
  template: PageTemplate;
  kind: PageTypeKind;
};

type PageTemplate = Record<string, ContentType>;

type GroupItem = {
  name: string;
  type: ContentType | GroupItem[];
};

type ContentType =
  | "string"
  | "text"
  | "img[]"
  | "img_caption[]"
  | "img"
  | "svg"
  | "video"
  | "date"
  | "number"
  | "bool"
  | GroupItem[];

type Page = {
  id: number;
  ordering: number;
  page_type: string;
  page_type_id: number;
  content: PageContent;
};

type PageContent = Record<string, any>;

type PageStore = {
  pages: Page[];
  pageTypes: PageType[];
};

declare namespace tinymce {
  export function init(obj: Object): void;
}

declare namespace tinyMCE {
  interface Editor {
    editorContainer: HTMLElement;
    getContent: () => string;
    remove: () => void;
  }

  export function get(): Editor[];
}

const saveTinyMCEState = () => {
  for (const editor of tinyMCE.get()) {
    const textArea = editor.editorContainer
      .previousElementSibling as HTMLTextAreaElement;
    textArea.innerText = editor.getContent();
  }
};

const reloadTinyMCE = () => {
  for (const editor of tinyMCE.get()) {
    editor.remove();
  }

  initTinyMCE();
};

const initTinyMCE = () => {
  tinymce.init({
    selector: "textarea",
    plugins:
      "advlist autolink link image lists charmap preview anchor pagebreak searchreplace wordcount visualblocks visualchars code fullscreen insertdatetime media nonbreaking table emoticons help",
    toolbar:
      "undo redo | styleselect | fontsizeselect | bold italic underline forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image emoticons | print preview fullpage | help",
    menubar: "edit insert format table help",
    skin: "snow",
    height: "400",
  });

  return "";
};

/*

  2.2 Common Functions

*/

type FetchPagesResult =
  | { ok: false; pageStore: undefined }
  | { ok: true; pageStore: PageStore };

const fetchPages = async (): Promise<FetchPagesResult> => {
  const res = await makeRequest("/admin-panel/api/pages", "GET");
  if (!res.ok) {
    handleRequestError(res);
    return { ok: false, pageStore: undefined };
  }
  return { ok: true, pageStore: res.body };
};

const pageHistory: string[] = [];
pageHistory.push(window.location.origin + "/admin-panel/");

const setSearchParams = (params: Record<string, string>) => {
  let newSearchQuery = "?";
  for (let paramName in params) {
    newSearchQuery += `${paramName}=${params[paramName].toString()}&`;
  }

  // Remove trailing '?' or '&'.
  newSearchQuery = newSearchQuery.substring(0, newSearchQuery.length - 1);

  const newURL =
    window.location.origin + window.location.pathname + newSearchQuery;

  // Set the URL of the page without reloading it.
  window.history.pushState({ path: newURL }, "", newURL);

  // Save new URL in pageHistory.
  if (pageHistory.length > 0) {
    if (pageHistory[pageHistory.length - 1] != window.location.href) {
      pageHistory.push(window.location.href);
    }
  } else {
    pageHistory.push(window.location.href);
  }
};

const goBackInHistory = () => {
  if (pageHistory.length > 1) {
    pageHistory.pop();
  }

  if (pageHistory.length > 0) {
    const prevUrl = pageHistory.pop();

    // Set the URL of the page without reloading it.
    window.history.pushState({ path: prevUrl }, "", prevUrl);
    goToTheRightPage();
  }
};

const goToTheRightPage = () => {
  const searchParams = new URLSearchParams(document.location.search);
  const tab = searchParams.get("tab");

  if (tab == null) {
    goToHomepage();
  } else if (tab == "pages") {
    showPages();
  } else if (tab == "edit-page") {
    const pageId = parseInt(searchParams.get("page-id") ?? "");

    if (pageId == null) {
      showPages();
    } else {
      editPage(pageId);
    }
  } else if (tab == "delete-page") {
    const pageId = parseInt(searchParams.get("page-id") ?? "");

    if (pageId == null) {
      showPages();
    } else {
      deletePage(pageId);
    }
  } else if (tab == "add-page") {
    const pageType = searchParams.get("page-type");

    if (pageType == null) {
      showPages();
    } else {
      addPage(pageType);
    }
  } else if (tab == "file-manager") {
    const path = searchParams.get("path")!;

    showFiles(path);
  } else if (tab == "user-management") {
    showUserManagement();
  }
};

// Handle back- and forward button.
addEventListener("popstate", goBackInHistory);

const goToHomepage = () => {
  setSearchParams({});
  $(".main").innerHTML = "";
};

const reduceArray = <T>(
  arr: Array<T>,
  f: (currentKey: T, i: number) => string
) => {
  let output = "";
  for (let i = 0; i < arr.length; i++) {
    output += f(arr[i], i);
  }
  return output;
};

const reduceObject = (obj: Object, f: (currentKey: string) => string) => {
  let output = "";
  for (let i in obj) {
    if (obj.hasOwnProperty(i)) {
      output += f(i);
    }
  }
  return output;
};

const reduceSet = <V>(set: Set<V>, f: (value: V) => string) => {
  let output = "";
  for (let value of set) {
    output += f(value);
  }
  return output;
};

const reduceMap = <K, V>(map: Map<K, V>, f: (key: K, value: V) => string) => {
  let output = "";
  for (let [key, value] of map) {
    output += f(key, value);
  }
  return output;
};

const showLoader = () => {
  $(".main").innerHTML = /* html */ `
  <div class="loader"></div>
  `;
};

const showCompilationProgress = async (res: MakeRequestResult) => {
  if (!res.ok) {
    return res;
  }

  const popupBodyProvide = logPopup("Compiling...");
  const reader = (res.body as ReadableStream).getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (value === undefined && !done) {
      continue;
    }

    // TODO: Chunk by newlines and parse JSON.
    popupBodyProvide(value);

    if (done) {
      break;
    }
  }
};

/* ===================
  3. Page Manager
=================== */

/*

  3.1 Show Pages

*/

let pageSwaps: [number, number][];

const showPages = async () => {
  showLoader();
  const { ok, pageStore } = await fetchPages();
  if (!ok) {
    return;
  }

  const { pages, pageTypes } = pageStore;
  pageSwaps = [];

  $(".main").innerHTML = /* html */ `
      <h1>Pages</h1>

      <div class="table-container">
        <table class="fullwidth">
          <thead>
            <tr>
              <td class="col-name">Page Name</td>
              <td class="col-options"></td>
              <td></td>
              <td></td>
            </tr>
          </thead>
          <tbody>
          ${reduceArray(pageTypes, (pageType) => {
            const pagesOfCurrentType = pages.filter(
              (page) => page.page_type == pageType.name
            );

            return /* html */ `
            ${
              pageType.kind === "list" || pagesOfCurrentType.length == 0
                ? /* html */ `
                <tr class="thick-border">
                  <td>${captitalise(pageType.name)}</td>
                  <td class="col-options">
                    <button class="small" onclick="addPage('${pageType.name}')">
                      Add page
                    </button>
                  </td>
                  <td></td>
                  <td></td>
                </tr>
                `
                : ""
            }
            ${reduceArray(
              pagesOfCurrentType,
              (page, i) => /* html */ `
                <tr data-pageid="${page.id}" class="page-row
                    ${pageType.kind === "list" ? "" : "thick-border"}">
                  <td class="col-page-name">
                    ${
                      pageType.kind === "list"
                        ? `${"&nbsp;".repeat(8)} > ${page.content.title}`
                        : captitalise(pageType.name)
                    }
                  </td>
                  <td class="col-options">
                    <button class="small" onclick="editPage(${
                      page.id
                    })">Edit</button>
                    ${
                      pageType.kind === "list"
                        ? /* html */ `
                        <button class="small red" onclick="deletePage(${page.id})">Delete</button>
                        `
                        : ""
                    }
                  </td>
                  <td>
                    ${
                      i != 0
                        ? /* html */ `
                        <img class="clickable-icon" src="/admin-panel/img/arrow-up.png" alt="up" title="move up" style="margin-right: .5em"
                          onclick="swapPages(${page.id}, ${
                            pagesOfCurrentType[i - 1].id
                          })">`
                        : ""
                    }
                  </td>
                  <td>
                    ${
                      i != pagesOfCurrentType.length - 1
                        ? /* html */ `
                        <img class="clickable-icon" src="/admin-panel/img/arrow-down.png" alt="down" title="move down"
                          onclick="swapPages(${page.id}, ${
                            pagesOfCurrentType[i + 1].id
                          })">
                        `
                        : ""
                    }
                  </td>
                </tr>
                `
            )}
            `;
          })}
          </tbody>
        </table>
      </div>
      <div id="save-page-order-container"></div>
      `;

  // 3.1.1 Swap Pages
  (window as any).swapPages = async (page1Id: number, page2Id: number) => {
    pageSwaps.push([page1Id, page2Id]);

    // Swap pages visually.
    const page1Row = $(`[data-pageid="${page1Id}"] .col-page-name`);
    const page2Row = $(`[data-pageid="${page2Id}"] .col-page-name`);
    const page1RowHTML = page1Row.innerHTML;
    page1Row.innerHTML = page2Row.innerHTML;
    page2Row.innerHTML = page1RowHTML;

    // Show save button.
    $("#save-page-order-container").innerHTML = /* html */ `
        <button id="save-page-order" onclick="updatePageOrder()">Save Changes</button>
        `;
  };
  (window as any).updatePageOrder = async () => {
    const res = await showCompilationProgress(
      await makeRequest(
        "/admin-panel/api/pages/swap",
        "PATCH",
        {
          swaps: pageSwaps,
        },
        { stream: true }
      )
    );
    if (res?.ok === false) {
      handleRequestError(res);
      showPages();
      return;
    }

    $("#save-page-order-container").innerHTML = "";
    notification("Pages updated", "Successfully updated the order of pages");
  };

  setSearchParams({
    tab: "pages",
  });
};

/*

  3.2 Edit Page

*/

const editPage = async (id: number) => {
  showLoader();

  const { ok, pageStore } = await fetchPages();
  if (!ok) {
    return;
  }

  const page = pageStore.pages.find((p) => p.id == id)!;
  const { template, kind } = pageStore.pageTypes.find(
    (p) => p.name == page.page_type
  )!;

  const pageTitle = kind === "list" ? page.content.title : page.page_type;

  $(".main").innerHTML = /* html */ `
  <h1>Editing page "${pageTitle}"</h1>
  ${reduceObject(
    template,
    (input) => /* html */ `
    <br><br>
    <h2>${input}:</h2>
    ${pageTemplateInputToHTML(template[input], input, page.content[input])}
    `
  )}
  <br><br>
  <button id="submit-changes" onclick="handleSubmit()">Save Page</button>
  `;

  // 3.2.1 Save Page

  const savePage = async (pageContent: PageContent, pageId: number) => {
    const res = await showCompilationProgress(
      await makeRequest(
        "/admin-panel/api/pages",
        "PATCH",
        {
          id: pageId,
          content: pageContent,
        },
        { stream: true }
      )
    );
    if (res?.ok === false) {
      handleRequestError(res);
      return;
    }
  };

  (window as any).handleSubmit = (keepEditing = false) => {
    const pageContent = collectInputs(template);

    savePage(pageContent, page.id).then(() => {
      notification("Saved page", `Successfully saved page "${pageTitle}"!`);

      if (!keepEditing) {
        showPages();
      }
    });
  };

  setSearchParams({
    tab: "edit-page",
    "page-id": page.id.toFixed(),
  });

  initTinyMCE();
};

/*

  3.3 Add Page

*/

const addPage = async (pageType: string) => {
  showLoader();

  const { ok, pageStore } = await fetchPages();
  if (!ok) {
    return;
  }

  const { template } = pageStore.pageTypes.find((p) => p.name == pageType)!;

  $(".main").innerHTML = /* html */ `
  <h1>Creating new page of type "${pageType}"</h1>
  ${reduceObject(
    template,
    (input: string) => /* html */ `
    <br><br>
    <h2>${input}:</h2>
    ${pageTemplateInputToHTML(template[input], input, "")}
    `
  )}
  <br><br>
  <button id="add-page" onclick="handleSubmit('${pageType}')">Add Page</button>
  `;

  (window as any).handleSubmit = async () => {
    const pageContent = collectInputs(template);
    const res = await showCompilationProgress(
      await makeRequest(
        "/admin-panel/api/pages",
        "POST",
        {
          type: pageType,
          content: pageContent,
        },
        { stream: true }
      )
    );
    if (res?.ok === false) {
      handleRequestError(res);
      return;
    }
    notification(
      "Added page",
      `Successfully added page "${pageContent.title}"!`
    );

    showPages();
  };

  initTinyMCE();
  setSearchParams({
    tab: "add-page",
    "page-type": pageType,
  });
};

/*

  3.4 Delete Page

*/

const deletePage = async (id: number) => {
  showLoader();

  const { ok, pageStore } = await fetchPages();
  if (!ok) {
    return;
  }

  const page = pageStore.pages.find((p) => p.id == id)!;
  const { kind } = pageStore.pageTypes.find((p) => p.name == page.page_type)!;

  const pageTitle = kind === "list" ? page.content.title : page.page_type;

  await popup(
    `Deleting page "${pageTitle}"`,
    "Are you sure you want to delete this page?",
    [
      {
        name: "Delete Page",
        classes: ["red"],
      },
    ]
  );

  setSearchParams({
    tab: "delete-page",
    "page-id": id.toFixed(),
  });

  const res = await showCompilationProgress(
    await makeRequest(
      "/admin-panel/api/pages",
      "DELETE",
      {
        id: page.id,
      },
      { stream: true }
    )
  );
  if (res?.ok === false) {
    handleRequestError(res);
    return;
  }

  notification("Deleted page", `Successfully deleted page "${pageTitle}"!`);
  showPages();
};

/*

  3.5 Page Template Input To HTML

*/

const globalInputTypes: GroupItem[][] = [];

const pageTemplateInputToHTML = (
  inputType: ContentType,
  inputName: string,
  inputContent: any,
  nested = false
): string => {
  console.log(inputType, inputName, inputContent, nested);

  switch (inputType) {
    default: {
      if (!Array.isArray(inputType)) {
        return /* html */ `
        <p>Error: unknown type "${(inputType as any).toString()}"</p>
        `;
      }

      const inputTypeIndex = globalInputTypes.length;
      globalInputTypes.push(inputType);

      return /* html */ `
      <div class="element-group" root="${!nested}" data-input="${inputName}">
        ${reduceArray(
          inputContent as any[],
          (el, i) => /* html */ `
        <div class="element-group-item">
          <div class="content">
            ${reduceArray(
              inputType,
              (group) => /* html */ `
              <h3>${group.name}:</h3>
              ${pageTemplateInputToHTML(
                group.type,
                group.name,
                el[group.name],
                true
              )}
              `
            )}
          </div>
          <br>
          <button class="small red" onclick="deleteGroup(this)">Delete</button>

          ${
            i != 0
              ? /* html */ `
              <button class="small move-group-button up" onclick="moveGroup(this, 'up')">Move up</button>
              `
              : ""
          }

          ${
            i != inputContent.length - 1
              ? /* html */ `
              <button class="small move-group-button down" onclick="moveGroup(this, 'down')">Move down</button>
              `
              : ""
          }
        </div>
        `
        )}
        <button class="small" onclick="addGroup(this, ${inputTypeIndex})">Add</button>
      </div>
      `;
    }

    case "text": {
      const value = inputContent
        ? (inputContent as string).replace(/"/g, "&quot;")
        : "";

      return /* html */ `
      <div class="tinymce-container" root="${!nested}" data-input="${inputName}">
        <textarea>
          ${value}
        </textarea>
      </div>
      `;
    }

    case "string": {
      const value = inputContent
        ? (inputContent as string).replace(/"/g, "&quot;")
        : "";

      return /* html */ `
      <input root="${!nested}" data-input="${inputName}" type="text" value="${value}" />
      `;
    }

    case "img[]": {
      const imgs = inputContent ? (inputContent as string[]) : [];

      return /* html */ `
      <div class="img-array" root="${!nested}" data-input="${inputName}">
        ${reduceArray(imgs, (img, i) =>
          generateImgArrayImg(img, i != 0, i != imgs.length - 1)
        )}
        <div class="img-array-plus" onclick="addImg('${inputName}')"></div>
      </div>
      `;
    }

    case "img_caption[]": {
      const imgsAndCaptions = inputContent
        ? (inputContent as [string, string][])
        : [];

      return /* html */ `
      <div class="img-array" root="${!nested}" data-input="${inputName}">
        ${reduceArray(imgsAndCaptions, (imgAndCaption, i) =>
          generateImgAndCaptionArrayInstance(
            imgAndCaption,
            i != 0,
            i != imgsAndCaptions.length - 1
          )
        )}
        <div class="img-array-plus" onclick="addImg('${inputName}', true)"></div>
      </div>
      `;
    }

    case "img": {
      const img = inputContent ? (inputContent as string) : "";

      return /* html */ `
      <div class="img-array" root="${!nested}" data-input="${inputName}">
        ${generateImgArrayImg(img, false, false)}
      </div>
      `;
    }

    case "svg": {
      const img = inputContent ? (inputContent as string) : "";

      return /* html */ `
      <div class="img-array" root="${!nested}" data-input="${inputName}" data-extensions="svg">
        ${generateImgArrayImg(img, false, false)}
      </div>
      `;
    }

    case "video": {
      const videoPath = inputContent ? (inputContent as string) : "";

      return /* html */ `
      <div class="video-input" root="${!nested}" data-input="${inputName}">
        <video src="${videoPath}" data-path="${videoPath.replace(
        /\"/g,
        "&quot;"
      )}" height="200" autoplay muted controls></video>
        <button class="small" onclick="editVideoPath(this)">Edit</button>
      </div>
      `;
    }

    case "date": {
      const date = new Date(inputContent);
      const yyyy = date.getFullYear().toString().padStart(4, "0");
      const mm = (date.getMonth() + 1).toString().padStart(2, "0");
      const dd = date.getDate().toString().padStart(2, "0");

      const dateString = `${yyyy}-${mm}-${dd}`;

      return /* html */ `
      <input root="${!nested}" data-input="${inputName}" type="date" value="${dateString}">
      `;
    }

    case "number": {
      const number = inputContent ? (inputContent as string) : "0";

      return /* html */ `
      <input root="${!nested}" data-input="${inputName}" type="number" value="${number}">
      `;
    }

    case "bool": {
      const bool = inputContent ? (inputContent as boolean) : false;

      return /* html */ `
      <input class="on-off-checkbox" root="${!nested}" data-input="${inputName}" type="checkbox" ${
        bool ? "checked" : ""
      }>
      `;
    }
  }
};

// 3.5.1 Generate .img-array-img Element

const generateImgArrayImg = (
  imgSrc: string,
  hasLeftArrow: boolean,
  hasRightArrow: boolean
) => /* html */ `
<div class="img-array-img">
  <div class="img-array-img-options">
    <button class="small light" onclick="editImg(this)">Edit</button>
    <button class="small light red" onclick="deleteImg(this)">Delete</button>
  </div>
  <div class="img-array-img-arrows">
    ${
      hasLeftArrow
        ? /* html */ `
        <img class="arrow-left" src="/admin-panel/img/arrow-left.png" alt="arrow-left" onclick="moveImg('left', this)">
        `
        : ""
    }
    ${
      hasRightArrow
        ? /* html */ `
        <img class="arrow-right" src="/admin-panel/img/arrow-right.png" alt="arrow-right" onclick="moveImg('right', this)">
        `
        : ""
    }
  </div>
  <img class="img" data-path="${imgSrc}" src="${imgSrc}">
</div>
`;

const generateImgAndCaptionArrayInstance = (
  imgAndCaption: [string, string],
  hasLeftArrow: boolean,
  hasRightArrow: boolean
) => /* html */ `
<div class="img-array-img img-caption-array-img">
  <div class="img-array-img-options">
    <button class="small light" onclick="editImg(this)">Edit</button>
    <button class="small light red" onclick="deleteImg(this)">Delete</button>
  </div>
  <div class="img-array-img-arrows">
    ${
      hasLeftArrow
        ? /* html */ `
        <img class="arrow-left" src="/admin-panel/img/arrow-left.png" alt="arrow-left" onclick="moveImgWithCaption('left', this)">
        `
        : ""
    }
    ${
      hasRightArrow
        ? /* html */ `
        <img class="arrow-right" src="/admin-panel/img/arrow-right.png" alt="arrow-right" onclick="moveImgWithCaption('right', this)">
        `
        : ""
    }
  </div>
  <img class="img" data-path="${imgAndCaption[0]}" src="${imgAndCaption[0]}">
  <br>
  <input class="caption" type="text"
    value="${imgAndCaption[1]}" placeholder="caption" />
</div>
`;

// 3.5.2 Edit Video Path

const editVideoPath = async (buttonEl: HTMLButtonElement) => {
  // Select a new video.
  const newVideoPath = await filePicker(
    {
      type: "file",
      title: "Edit video",
      body: "Select a new video",
      buttonText: "Select",
      extensions: videoExtensions,
    },
    false
  ).catch(() => {
    throw new Error(`User cancelled`);
  });

  // Update the old video.
  const videoEl = buttonEl.parentElement!.$<HTMLVideoElement>("video");
  videoEl.setAttribute("data-path", `/content${newVideoPath}`);
  videoEl.src = `/content${newVideoPath}`;
};

/*

  3.6 Collect Page Template Inputs

*/

const isChildOf = (child: HTMLElement, parent: HTMLElement) => {
  let node = child;

  while (node.parentElement != null) {
    node = node.parentElement;
    if (node == parent) return true;
  }

  return false;
};

const collectInput = (input: HTMLElement, inputType: ContentType) => {
  switch (inputType) {
    default: {
      const itemEls = input.$a<HTMLDivElement>(".element-group-item");
      const out = [];

      for (let i = 0; i < itemEls.length; i++) {
        const itemEl = itemEls[i].$<HTMLDivElement>(".content")!;
        const item: Record<string, any> = {};

        for (const groupItem of inputType) {
          const childInput = (
            [].slice.call(itemEl.children) as HTMLElement[]
          ).filter(
            (potChildInput) =>
              potChildInput.getAttribute("data-input") == groupItem.name
          )[0];

          item[groupItem.name] = collectInput(childInput, groupItem.type);
        }

        out.push(item);
      }

      return out;
    }

    case "text": {
      return tinyMCE
        .get()
        .filter((editor) => isChildOf(editor.editorContainer, input))[0]
        .getContent();
    }

    case "string": {
      return (input as HTMLInputElement).value.trim();
    }

    case "img[]": {
      const out = [];
      const imgs = input.$a<HTMLImageElement>(".img");

      for (let i = 0; i < imgs.length; i++) {
        out[i] = imgs[i].getAttribute("data-path");
      }

      return out;
    }

    case "img_caption[]": {
      const out = [];
      const imgs = input.$a<HTMLImageElement>(".img");
      const captions = input.$a<HTMLInputElement>(".caption");

      for (let j = 0; j < imgs.length; j++) {
        out[j] = [imgs[j].getAttribute("data-path"), captions[j].value];
      }

      return out;
    }

    case "img": {
      return input.$<HTMLImageElement>(".img")!.getAttribute("data-path");
    }

    case "svg": {
      return input.$<HTMLImageElement>(".img")!.getAttribute("data-path");
    }

    case "video": {
      return input.$<HTMLVideoElement>("video")!.getAttribute("data-path");
    }

    case "date": {
      return new Date((input as HTMLInputElement).value).getTime();
    }

    case "number": {
      return (input as HTMLInputElement).value;
    }

    case "bool": {
      return (input as HTMLInputElement).checked;
    }
  }
};

const collectInputs = (template: PageTemplate) => {
  // Get all input elements.
  const elements = $a<HTMLInputElement>('[root="true"][data-input]');
  const pageContent: PageContent = {};

  // Parse inputs.
  for (let i = 0; i < elements.length; i++) {
    const inputKey = elements[i].getAttribute("data-input")!;
    const inputType = template[inputKey];
    pageContent[inputKey] = collectInput(elements[i], inputType);
  }

  return pageContent;
};

/*

  3.7 img[] Functions

*/

// 3.7.1 Move Image

const moveImg = async (
  direction: "left" | "right",
  arrowEl: HTMLImageElement
) => {
  const imgArrayImgEl = arrowEl.parentElement!.parentElement!;

  // Swap images visually.
  // Get the first image element that has to move.
  const imgEl1 = imgArrayImgEl.$<HTMLImageElement>(".img")!;

  // Get the other image element.
  const imgEl2 =
    direction == "left"
      ? imgArrayImgEl.previousElementSibling!.$<HTMLImageElement>(".img")!
      : imgArrayImgEl.nextElementSibling!.$<HTMLImageElement>(".img")!;

  // Swap the images.
  imgEl2.parentElement!.appendChild(imgEl1);
  imgArrayImgEl.appendChild(imgEl2);
};

const moveImgWithCaption = async (
  direction: "left" | "right",
  arrowEl: HTMLImageElement
) => {
  const imgArrayImgEl = arrowEl.parentElement!.parentElement!;

  // Swap images visually.
  // Get the first image element and save its path.
  const imgEl1 = imgArrayImgEl.$<HTMLImageElement>(".img")!;
  const imgSource1 = imgEl1.getAttribute("data-path")!;

  // Get the first caption.
  const captionEl1 = imgArrayImgEl.$<HTMLInputElement>(".caption")!;
  const captionValue1 = captionEl1.value;

  // Get the other image element and save its path.
  const imgEl2 =
    direction == "left"
      ? imgArrayImgEl.previousElementSibling!.$<HTMLImageElement>(".img")!
      : imgArrayImgEl.nextElementSibling!.$<HTMLImageElement>(".img")!;
  const imgSource2 = imgEl2.getAttribute("data-path")!;

  // Get the other caption.
  const captionEl2 =
    direction == "left"
      ? imgArrayImgEl.previousElementSibling!.$<HTMLInputElement>(".caption")!
      : imgArrayImgEl.nextElementSibling!.$<HTMLInputElement>(".caption")!;
  const captionValue2 = captionEl2!.value;

  // Swap the images.
  imgEl1.src = imgSource2;
  imgEl1.setAttribute("data-path", imgSource2);
  imgEl2.src = imgSource1;
  imgEl2.setAttribute("data-path", imgSource1);

  // Swap the captions.
  captionEl1.value = captionValue2;
  captionEl2.value = captionValue1;
};

// 3.7.2 Edit Image

const editImg = async (buttonEl: HTMLButtonElement) => {
  // Get the possible extensions.
  const extensionsList =
    buttonEl.parentElement!.parentElement!.parentElement!.getAttribute(
      "data-extensions"
    );
  const extensions =
    extensionsList == null
      ? imageExtensions
      : new Set(extensionsList.split(","));

  // Select a new image.
  const newImgPath = await filePicker(
    {
      type: "file",
      title: "Edit image",
      body: "Select a new image",
      buttonText: "Select",
      extensions,
    },
    false
  ).catch(() => {
    throw new Error(`User cancelled`);
  });

  // Update the old image.
  // TODO: show loader while image is loading.
  const imgEl =
    buttonEl.parentElement!.parentElement!.$<HTMLImageElement>(".img")!;

  imgEl.setAttribute("data-path", `/content${newImgPath}`);
  imgEl.src = `/content${newImgPath}`;
};

// 3.7.3 Delete Image

const deleteImg = async (buttonEl: HTMLButtonElement) => {
  const imgArrayImgEl = buttonEl.parentElement!.parentElement!;

  // Get left and right imgs (which can be null).
  const leftImgEl = imgArrayImgEl.previousElementSibling;
  const rightImgEl = imgArrayImgEl.nextElementSibling;

  // Remove the image.
  imgArrayImgEl.remove();

  // Update the arrows of the left and right imgs if necessary.
  if (leftImgEl == null) {
    rightImgEl!.$(".arrow-left")!.remove();
  }

  if (rightImgEl != null) {
    if (!rightImgEl.classList.contains("img-array-img")) {
      leftImgEl!.$(".arrow-right")!.remove();
    }
  }
};

// 3.7.4 Add Image

const addImg = async (inputName: string, withCaption = false) => {
  // Select new images.
  const filePickerRes = await filePicker(
    {
      type: "file",
      title: "Add image",
      body: "Select a new image",
      buttonText: "Select",
      extensions: imageExtensions,
    },
    true
  );
  if (!filePickerRes.ok) {
    return;
  }

  const newImgPaths = filePickerRes.result as string[];

  const imgArrayPlus = $(/**/ `[data-input="${inputName}"`).$<HTMLDivElement>(
    ".img-array-plus"
  )!;

  // Add the images before it.
  if (!withCaption) {
    imgArrayPlus.insertAdjacentHTML(
      "beforebegin",
      newImgPaths
        .map((newImgPath) =>
          generateImgArrayImg(
            `/content${newImgPath}`,
            imgArrayPlus.previousElementSibling != null,
            false
          )
        )
        .join("")
    );
  } else {
    imgArrayPlus.insertAdjacentHTML(
      "beforebegin",
      newImgPaths
        .map((newImgPath) =>
          generateImgAndCaptionArrayInstance(
            [`/content${newImgPath}`, ""],
            imgArrayPlus.previousElementSibling != null,
            false
          )
        )
        .join("")
    );
  }

  // Add a right arrow to the previous image if it exists.
  const prevImgArrayImg =
    imgArrayPlus.previousElementSibling!.previousElementSibling!;

  if (prevImgArrayImg != null && !withCaption) {
    prevImgArrayImg.$(".img-array-img-arrows")!.innerHTML += /* html */ `
    <img class="arrow-right" src="/admin-panel/img/arrow-right.png" alt="arrow-right" onclick="moveImg('right', this)">
    `;
  }

  if (prevImgArrayImg != null && withCaption) {
    prevImgArrayImg.$(".img-array-img-arrows")!.innerHTML += /* html */ `
    <img class="arrow-right" src="/admin-panel/img/arrow-right.png" alt="arrow-right" onclick="moveImgWithCaption('right', this)">
    `;
  }
};

/*

  3.8 Element Group Functions

*/

// 3.8.1 Move Group

const moveGroup = (buttonEl: HTMLButtonElement, direction: "up" | "down") => {
  // For some reason we need to do this twice to get it to work.
  saveTinyMCEState();
  saveTinyMCEState();

  const thisItem = buttonEl.parentElement!.$<HTMLDivElement>(".content")!;
  const thisItemContainer = buttonEl.parentElement!;

  if (direction == "up") {
    const previousItem =
      buttonEl.parentElement!.previousElementSibling!.$<HTMLDivElement>(
        ".content"
      )!;
    const previousItemContainer =
      buttonEl.parentElement!.previousElementSibling!;

    thisItemContainer.insertAdjacentElement("afterbegin", previousItem);
    previousItemContainer.insertAdjacentElement("afterbegin", thisItem);
  } else {
    const nextItem =
      buttonEl.parentElement!.nextElementSibling!.$<HTMLDivElement>(
        ".content"
      )!;
    const nextItemContainer = buttonEl.parentElement!.nextElementSibling!;

    thisItemContainer.insertAdjacentElement("afterbegin", nextItem);
    nextItemContainer.insertAdjacentElement("afterbegin", thisItem);
  }

  // For some reason we need to reload it twice to get it to work.
  reloadTinyMCE();
  reloadTinyMCE();
};

// 3.8.2 Delete Group

const deleteGroup = (buttonEl: HTMLButtonElement) => {
  const previousItem = buttonEl.parentElement!.previousElementSibling!;
  const nextItem = buttonEl.parentElement!.nextElementSibling!;

  if (previousItem == null) {
    if (nextItem != null) {
      nextItem.$(".move-group-button.up")!.remove();
    }
  }

  if (nextItem == null) {
    if (previousItem != null) {
      previousItem.$(".move-group-button.down")!.remove();
    }
  }

  buttonEl.parentElement!.remove();
};

// 3.8.3 Add Group

const addGroup = (buttonEl: HTMLButtonElement, inputTypeIndex: number) => {
  const inputType = globalInputTypes[inputTypeIndex];

  if (buttonEl.previousElementSibling != null) {
    buttonEl.previousElementSibling.insertAdjacentHTML(
      "beforeend",
      /* html */ `
      <button class="small move-group-button down" onclick="moveGroup(this, 'down')">Move down</button>
      `
    );
  }

  buttonEl.insertAdjacentHTML(
    "beforebegin",
    /* html */ `
    <div class="element-group-item">
      <div class="content">
        ${reduceArray(
          inputType,
          (group) => /* html */ `
        <h3>${group.name}:</h3>
        ${pageTemplateInputToHTML(group.type, group.name, null, true)}
        `
        )}
      </div>
      <br>
      <button class="small red" onclick="deleteGroup(this)">Delete</button>
      <button class="small move-group-button up" onclick="moveGroup(this, 'up')">Move up</button>
    </div>
    `
  );

  initTinyMCE();
};

/* ===================
  4. File Manager
=================== */

/*

  4.1 Upload Files

*/

const uploadFiles = async (fileList: FileList, path = "/") => {
  const files = [...fileList];
  const progressBar = new ProgressBar();
  const fileUploadRes = await doFileUpload(
    "/admin-panel/api/files",
    path,
    files,
    {
      onRequestUploadProgress: (e) => progressBar.set(e.loaded / e.total),
    }
  );
  if (!fileUploadRes.ok) {
    handleRequestError(fileUploadRes);
  }
  progressBar.remove();
};

/*

  4.2 Drop Area

*/

const initDropArea = (path = "/") =>
  new Promise((resolve) => {
    const dropArea = $<HTMLDivElement>(".drop-area");

    const hiddenUploadInput = document.createElement("input");
    hiddenUploadInput.type = "file";
    hiddenUploadInput.multiple = true;
    hiddenUploadInput.style.visibility = "hidden";
    hiddenUploadInput.onchange = () => {
      uploadFiles(hiddenUploadInput.files!, path).then(resolve);
    };

    dropArea.appendChild(hiddenUploadInput);

    const preventDefaults = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const highlight = () => {
      dropArea.classList.add("highlighted");
    };

    const unhighlight = () => {
      dropArea.classList.remove("highlighted");
    };

    const drop = (e: DragEvent) => {
      const { dataTransfer } = e;
      const { files } = dataTransfer!;

      // TODO: upload folders https://stackoverflow.com/questions/3590058/does-html5-allow-drag-drop-upload-of-folders-or-a-folder-tree.
      uploadFiles(files, path).then(resolve);
    };

    ["dragenter", "dragover", "dragleave", "drop"].forEach((event) => {
      dropArea.addEventListener(event, preventDefaults, false);
    });
    ["dragenter", "dragover"].forEach((event) => {
      dropArea.addEventListener(event, highlight, false);
    });
    ["dragleave", "drop"].forEach((event) => {
      dropArea.addEventListener(event, unhighlight, false);
    });

    dropArea.addEventListener("drop", drop, false);
  });

type FileInfo = {
  name: string;
  path: string;
  isDirectory: boolean;
  filesInside: number;
  size: number;
  modified: string;
  hash: string;
};

/*

  4.3 File Picker

*/

type FilePickerOptions = {
  type?: "file" | "directory" | "new-file";
  title: string;
  body: string;
  buttonText: string;
  newFileName?: string;
  extensions?: Set<string>;
};

type FilePickerResponse =
  | { ok: true; result: string[] | string }
  | { ok: false; result: undefined };

function filePicker<T extends boolean>(
  options: FilePickerOptions,
  multiple?: T
): Promise<FilePickerResponse> {
  return new Promise(async (resolve) => {
    options = {
      ...{
        type: "file",
        newFileName: "new-file-name.txt",
      },
      ...options,
    };

    const filePickerEl = document.createElement("div");
    filePickerEl.classList.add("popup");
    filePickerEl.innerHTML = /* html */ `
    <a class="popup-close-button">✕</a>
    <h1 class="popup-title">${options.title}</h1>

    ${
      options.body != undefined
        ? /* html */ `
        <p class="popup-body">${options.body}</p>
        ${
          options.extensions == null
            ? ""
            : /* html */ `
              <p>
              Allowed extensions: ${Array.from(options.extensions).join(", ")}
              </p>
              `
        }
        `
        : ""
    }

    <div class="file-list-container">
      <ul class="file-list file-list-root">
        <li class="file-list-item file-list-root" onclick="selectLI(this)" onmouseover="hoverLI(this)" onmouseleave="hoverLI(this, false)" data-path="/">
          <img class="file-manager-file-icon" src="/admin-panel/img/file-icons/dir.png" alt="dir" onerror="
            this.src = '${`/admin-panel/img/file-icons/unknown.png`}'; this.onerror = null
          ">
          /
        </li>
      </ul>
    </div>

    ${
      options.type == "new-file"
        ? /* html */ `
        <p>Fill in the name of the file</p>
        <input type="text" class="filepicker-new-file" value="${options.newFileName}" placeholder="Enter new file name...">
        `
        : ""
    }

    <br><br>
    <button class="small">${options.buttonText}</button>
    `;

    // 4.3.1 Create UL from files

    const createULFromFiles = async (
      path: string
    ): Promise<
      { ok: true; el: HTMLElement } | { ok: false; el: undefined }
    > => {
      const { ok, files } = await getFiles(path);
      if (!ok) {
        return { ok: false, el: undefined };
      }

      // Filter only directories if needed.
      let filteredFiles = files;
      if (options.type == "directory" || options.type == "new-file") {
        filteredFiles = filteredFiles.filter((file) => file.isDirectory);
      }

      // Filter extensions if needed.
      if (options.extensions != undefined) {
        filteredFiles = filteredFiles.filter(
          (file) =>
            options.extensions!.has(getExtension(file.name)) || file.isDirectory
        );
      }

      const fileListEl = document.createElement("ul");
      fileListEl.classList.add("file-list");

      for (const file of files) {
        const { name } = file;
        const extension = file.isDirectory ? "dir" : getExtension(name);
        const fileIconFile = imageExtensions.has(extension)
          ? `/thumbnails/${file.hash}.png`
          : `/admin-panel/img/file-icons/${extension}.png`;

        fileListEl.innerHTML += /* html */ `
        <li class="file-list-item" onclick="selectLI(this)" onmouseover="hoverLI(this)" onmouseleave="hoverLI(this, false)" data-path="${
          file.isDirectory ? path + file.name + "/" : path + file.name
        }">
          ${
            file.isDirectory
              ? /* html */ `<span class="plus-button" data-expanded="false" onclick="expandDirectory(this)"></span>`
              : ""
          }
          <img class="file-manager-file-icon" src="${fileIconFile}" alt="${extension}" onerror="
            this.src = '/admin-panel/img/file-icons/unknown.png';
            this.onerror = null;
          ">
          ${file.name}
        </li>
        `;
      }

      // 4.3.1.1 li.file-list-item hover animation

      (window as any).hoverLI = (li: HTMLLIElement, hover = true) => {
        if (event!.target != li) {
          return;
        }

        if (hover) {
          li.classList.add("hover");
          const hoverChangeEvent = new CustomEvent("hoverchange", {
            detail: {
              target: li,
            },
          });

          dispatchEvent(hoverChangeEvent);
          addEventListener(
            "hoverchange",
            (e: CustomEventInit<{ target: HTMLLIElement }>) => {
              if (e.detail!.target != li) {
                li.classList.remove("hover");
              }
            }
          );
        } else {
          li.classList.remove("hover");
        }
      };

      // 4.3.1.2 li.file-list-item select handler

      (window as any).selectLI = (li: HTMLLIElement) => {
        if (event!.target != li) {
          return;
        }

        if (li.getAttribute("data-selected") == "true") {
          li.classList.remove("selected");
          li.setAttribute("data-selected", "false");
        } else {
          li.classList.add("selected");
          li.setAttribute("data-selected", "true");

          const hoverChangeEvent = new CustomEvent("selectionchange", {
            detail: {
              newlySelected: li,
            },
          });

          dispatchEvent(hoverChangeEvent);

          addEventListener(
            "selectionchange",
            (e: CustomEventInit<{ newlySelected: HTMLLIElement }>) => {
              if (e.detail!.newlySelected != li && !multiple) {
                li.classList.remove("selected");
                li.setAttribute("data-selected", "false");
              }
            }
          );
        }
      };

      // 4.3.1.3 Expand directory

      (window as any).expandDirectory = async (button: HTMLSpanElement) => {
        const li = button.parentElement!;

        const directoryPath = li.getAttribute("data-path")!;
        const expanded = button.getAttribute("data-expanded");

        if (expanded == "true") {
          li.$("ul.file-list")!.remove();
          button.setAttribute("data-expanded", "false");

          // Decrement the margin of all parents.
          const childElementCount = parseInt(
            getComputedStyle(li).getPropertyValue("--files-inside")
          );
          let currentLi = li;

          while (true) {
            const filesInside = parseInt(
              getComputedStyle(currentLi).getPropertyValue("--files-inside")
            );

            // Decrement files inside.
            currentLi.style.setProperty(
              "--files-inside",
              (filesInside - childElementCount).toString()
            );

            // Traverse backwards.
            currentLi = currentLi.parentElement!.parentElement!;

            // Break if we reached the root.
            if (!currentLi.classList.contains("file-list-item")) {
              break;
            }
          }
        } else {
          // TODO: show loader.
          const { ok, el } = await createULFromFiles(directoryPath);
          if (!ok) {
            return;
          }
          li.appendChild(el);

          // Increment the margin of all parents.
          let currentLi = li;
          const { childElementCount } = el;

          while (true) {
            const filesInside = parseInt(
              getComputedStyle(currentLi).getPropertyValue("--files-inside")
            );

            // Increment files inside.
            currentLi.style.setProperty(
              "--files-inside",
              (filesInside + childElementCount).toString()
            );

            // Traverse backwards.
            currentLi = currentLi.parentElement!.parentElement!;

            // Break if we reached the root.
            if (!currentLi.classList.contains("file-list-item")) {
              break;
            }
          }

          button.setAttribute("data-expanded", "true");
        }
      };

      return { ok: true, el: fileListEl };
    };

    // Append the File Picker UL to the popup.
    const { ok, el } = await createULFromFiles("/");
    if (!ok) {
      return { ok: false, result: undefined };
    }

    filePickerEl.$("li.file-list-root")!.appendChild(el);

    const rootLI = filePickerEl.$<HTMLLIElement>("li.file-list-root")!;
    rootLI.style.setProperty("--files-inside", el.childElementCount.toString());

    const removePopup = () => {
      filePickerEl.classList.add("closed");
      setTimeout(() => {
        filePickerEl.remove();
      }, 300);
    };

    // 4.3.2 Handle submit button click

    filePickerEl.$("button")!.addEventListener("click", () => {
      removePopup();

      // Get all selected files.
      const lis = filePickerEl.$a("li.file-list-item");
      const filePaths: string[] = [];

      lis.forEach((li) => {
        if (li.classList.contains("selected")) {
          let path = li.getAttribute("data-path")!;

          if (options.type == "new-file") {
            path += filePickerEl.$<HTMLInputElement>(
              ".filepicker-new-file"
            )!.value;
          }

          filePaths.push(path);
        }
      });

      // Reject if there are no files, else resolve.
      if (filePaths.length == 0) {
        resolve({ ok: false, result: undefined });
      } else {
        if (multiple) {
          resolve({ ok: true, result: filePaths });
        } else {
          resolve({ ok: true, result: filePaths[0] });
        }
      }
    });

    // Add popup to page.
    document.body.appendChild(filePickerEl);

    // Close popup when x button or escape is pressed.
    filePickerEl.$("a.popup-close-button")!.addEventListener("click", () => {
      removePopup();
      resolve({ ok: false, result: undefined });
    });

    const escapePressHandler = (e: KeyboardEvent) => {
      if (e.key == "Escape") {
        removePopup();
        removeEventListener("keyup", escapePressHandler);
      }
    };

    addEventListener("keyup", escapePressHandler);
  });
}

/*

  4.4 Show Files

*/

type GetFilesResponse =
  | { ok: false; files: undefined }
  | { ok: true; files: FileInfo[] };

const getFiles = async (path = "/"): Promise<GetFilesResponse> => {
  const res = await makeRequest(
    `/admin-panel/api/files/${encodeURIComponent(path)}`,
    "GET"
  );
  if (!res.ok) {
    handleRequestError(res); // TODO: Callers shouldn't have to handle errors.
    return { ok: false, files: undefined };
  }
  return { ok: true, files: res.body.files };
};

const upALevel = (path: string) => {
  if (path.length <= 1) {
    return path;
  }

  // Remove trailing slash.
  path = path.substring(0, path.length - 1);
  const lastSlash = path.lastIndexOf("/");

  return path.substring(0, lastSlash + 1);
};

const openFile = (path: string) => {
  window.open(`/content${path}`);
};

let checkboxStatus = "unchecked";
let checkedCheckboxes = 0;

const allCheckboxesChecked = () => {
  const checkboxes = $a<HTMLInputElement>(
    'tbody .col-checkbox input[type="checkbox"]'
  );

  for (let checkbox of checkboxes) {
    if (!checkbox.checked) {
      return false;
    }
  }

  return true;
};

const checkAllCheckboxes = (check = true) => {
  const checkboxes = $a<HTMLInputElement>(
    'tbody .col-checkbox input[type="checkbox"]'
  );

  if (check) {
    checkboxStatus = "checked";
  } else {
    checkboxStatus = "unchecked";
  }

  checkboxes.forEach((checkbox) => {
    if (checkbox.checked != check) {
      checkbox.checked = check;
      checkbox.onchange!(new Event("change"));
    }
  });
};

const uncheckAllCheckboxes = () => checkAllCheckboxes(false);

const toggleAllCheckboxes = () => {
  if (allCheckboxesChecked()) {
    uncheckAllCheckboxes();
  } else {
    checkAllCheckboxes();
  }
};

const showFiles = async (path = "/") => {
  showLoader();

  setSearchParams({
    tab: "file-manager",
    path,
  });

  const filesRes = await getFiles(path);
  if (!filesRes.ok) {
    return;
  }

  const files = filesRes.files;
  files.sort((file) => (file.isDirectory ? -1 : 1));

  $(".main").innerHTML = /* html */ `
  <div class="drop-area">
    <h1>Folder: ${path}</h1>

    <button class="small" onclick="showFiles(upALevel('${path}'))">Up a level</button>
    <button class="small" onclick="openFileInput()">Upload Files</button>
    <button class="small" onclick="createNewDirectory('${path}')">New Folder</button>
    <div class="bulk-actions hidden">
      Selected Files:
      <button class="small" onclick="bulkCopyFiles()">Copy</button>
      <button class="small" onclick="bulkMoveFiles()">Move</button>
      <button class="small red" onclick="bulkDeleteFiles()">Delete</button>
    </div>

    <br><br>

    <div class="table-container">
      <table class="fullwidth">

        <thead>
          <tr>
            <td class="col-checkbox">
              <input type="checkbox" onclick="toggleAllCheckboxes()" title="Select all">
            </td>
            <td class="col-icon"></td>
            <td class="col-name">Name</td>
            <td class="col-size">Size</td>
            <td class="col-modified">Last Modified</td>
            <td class="col-options"></td>
          </tr>
        </thead>

        <tbody>
          ${reduceArray(files, (file) => {
            const { name } = file;
            const size = file.isDirectory ? "–" : parseSize(file.size);
            const modified = parseDate(file.modified);

            const extension = file.isDirectory ? "dir" : getExtension(name);

            (window as any).toggleDropdown = (
              el: HTMLDivElement,
              e: MouseEvent
            ) => {
              const isDescendant = (
                child: HTMLElement,
                parent: HTMLElement
              ) => {
                while (child != null) {
                  if (child == parent) {
                    return true;
                  }
                  child = child.parentElement!;
                }

                return false;
              };

              if (el == e.target) {
                el.classList.toggle("active");
              }

              setTimeout(() => {
                const handler = (mouseEvent: MouseEvent) => {
                  if (!isDescendant(mouseEvent.target as HTMLElement, el)) {
                    el.classList.remove("active");
                    document.removeEventListener("click", handler);
                  }
                };

                document.addEventListener("click", handler);
              }, 0);
            };

            let bulkFileActionsShown = false;

            const showBulkFileActions = () => {
              bulkFileActionsShown = true;
              $(".bulk-actions").classList.remove("hidden");
            };

            const hideBulkFileActions = () => {
              bulkFileActionsShown = false;
              $(".bulk-actions").classList.add("hidden");
            };

            (window as any).handleFileCheckboxes = (
              checkboxEl: HTMLInputElement
            ) => {
              const selectAllCheckbox = $<HTMLInputElement>(
                'thead .col-checkbox input[type="checkbox"]'
              );

              if (checkboxEl.checked) {
                checkedCheckboxes++;

                // Check 'select all' checkbox if necessary.
                if (checkedCheckboxes == files.length) {
                  selectAllCheckbox.checked = true;
                }
              } else {
                checkedCheckboxes--;

                // Uncheck 'select all' checkbox if necessary.
                if (checkedCheckboxes == files.length - 1) {
                  selectAllCheckbox.checked = false;
                }
              }

              if (checkedCheckboxes > 0) {
                if (!bulkFileActionsShown) {
                  showBulkFileActions();
                }
              } else {
                hideBulkFileActions();
              }
            };

            const getSelectedFiles = () => {
              const tableRows = $a("tr.file-row");
              const selectedFiles: FileInfo[] = [];

              for (let i = 0; i < tableRows.length; i++) {
                const checkboxEl = tableRows[i].$<HTMLInputElement>(
                  'input[type="checkbox"]'
                );

                if (checkboxEl!.checked) {
                  selectedFiles.push(files[i]);
                }
              }

              return selectedFiles;
            };

            // 4.4.1 Bulk Delete Files
            (window as any).bulkDeleteFiles = async () => {
              const selectedFiles = getSelectedFiles();

              const popupRes = await popup(
                "Deleting multiple files",
                `Are you sure you want to delete ${numifyNoun(
                  selectedFiles.length,
                  "file",
                  "files"
                )}?
                  <codeblock>${reduceArray(
                    selectedFiles,
                    (f) => f.name + "<br>"
                  )}</codeblock>`,
                [
                  {
                    name: "Delete",
                    classes: ["red"],
                  },
                  {
                    name: "Cancel",
                  },
                ]
              );
              const { buttonName } = popupRes;

              if (buttonName == "Delete") {
                const paths = selectedFiles.map((f) => path + f.name);
                const res = await makeRequest(
                  "/admin-panel/api/files",
                  "DELETE",
                  {
                    paths,
                  }
                );
                if (!res.ok) {
                  handleRequestError(res);
                  return;
                }

                // Refresh files.
                showFiles(path);
              }
            };

            // 4.4.2 Bulk Copy Files
            (window as any).bulkCopyFiles = async () => {
              const selectedFiles = getSelectedFiles();

              const filePickerRes = await filePicker(
                {
                  type: "directory",
                  title: "Copy files",
                  body: "Select a folder to where you want to copy the files",
                  buttonText: "Select folder",
                },
                false
              );
              if (!filePickerRes.ok) {
                // User cancelled.
                return;
              }

              const selectedFolder = filePickerRes.result as string;
              const res = await makeRequest("/admin-panel/api/files", "PATCH", {
                mode: "copy-multiple",
                sources: selectedFiles.map((selectedFile) => selectedFile.path),
                destination: selectedFolder,
              });
              if (!res.ok) {
                handleRequestError(res);
                return;
              }

              notification(
                "Copied Files",
                `Successfully copied ${numifyNoun(
                  selectedFiles.length,
                  "file",
                  "files"
                )} to <code>${selectedFolder}</code>`
              );

              // Refresh files.
              showFiles(path);
            };

            // 4.4.3 Bulk Move Files
            (window as any).bulkMoveFiles = async () => {
              const selectedFiles = getSelectedFiles();

              const filePickerRes = await filePicker(
                {
                  type: "directory",
                  title: "Move Files",
                  body: "Select a folder to where you want to move the files",
                  buttonText: "Select folder",
                },
                false
              );
              if (!filePickerRes.ok) {
                // User cancelled.
                return;
              }

              const selectedFolder = filePickerRes.result as string;
              const res = await makeRequest("/admin-panel/api/files", "PATCH", {
                mode: "move-multiple",
                sources: selectedFiles.map((selectedFile) => selectedFile.path),
                destination: selectedFolder,
              });
              if (!res.ok) {
                handleRequestError(res);
                return;
              }

              notification(
                "Moved Files",
                `Successfully moved ${numifyNoun(
                  selectedFiles.length,
                  "file",
                  "files"
                )} to <code>${selectedFolder}</code>`
              );

              // Refresh files.
              showFiles(path);
            };

            const fileIconFile = imageExtensions.has(extension)
              ? `/thumbnails/${file.hash}.png`
              : `/admin-panel/img/file-icons/${extension}.png`;

            return /* html */ `
            <tr class="file-row">
              <td class="col-checkbox">
                <input type="checkbox" onchange="handleFileCheckboxes(this)">
              </td>

              <td class="col-icon">
                <img class="file-manager-file-icon" src="${fileIconFile}" alt="${extension}" onerror="
                  this.src = '${`/admin-panel/img/file-icons/unknown.png`}'; this.onerror = null
                ">
              </td>

              <td class="col-name" onclick="
                ${
                  file.isDirectory
                    ? `showFiles('${path + file.name}/')`
                    : `openFile('${path + file.name}')`
                }
              ">
                ${file.name}
              </td>

              <td class="col-size">
                ${file.isDirectory ? file.filesInside + " items" : size}
              </td>

              <td class="col-modified">
                ${modified}
              </td>

              <td class="col-options">
                <button class="small" onclick="copyFile('${
                  path + file.name
                }')">Copy</button>
                <button class="small" onclick="moveFile('${
                  path + file.name
                }')">Move</button>
                <button class="small" onclick="renameFile('${
                  path + file.name
                }')">Rename</button>
                <button class="small red" onclick="deleteFile('${
                  path + file.name
                }')">Delete</button>
              </td>
            </tr>
            `;
          })}
        </tbody>

      </table>
    </div>
  </div>
  `;
  (window as any).openFileInput = () => {
    $("input[type=file]").click();
  };

  await initDropArea(path);
  // On file upload, refresh files.
  showFiles(path);
};

/*

  4.5 Delete File

*/

const deleteFile = async (filePath: string) => {
  const popupRes = await popup(
    "Deleting file",
    `Are you sure you want to delete file: <code>${filePath}</code>?`,
    [
      {
        name: "Delete",
        classes: ["red"],
      },
      {
        name: "Cancel",
      },
    ]
  );

  if (popupRes.buttonName == "Delete") {
    const res = await makeRequest("/admin-panel/api/files", "DELETE", {
      paths: [filePath],
    });
    if (!res.ok) {
      handleRequestError(res);
      return;
    }

    showFiles(new URLSearchParams(document.location.search).get("path")!);
  }
};

/*

  4.6 Copy File and Move File

*/

(window as any).copyFile = (sourcePath: string) =>
  copyOrMoveFile(sourcePath, "copy");

(window as any).moveFile = (sourcePath: string) =>
  copyOrMoveFile(sourcePath, "move");

// 4.6.1 Copy / Move File With Different Name
const copyOrMoveFile = async (sourcePath: string, mode: "copy" | "move") => {
  const filePickerRes = await filePicker(
    {
      type: "new-file",
      title: `${captitalise(mode)} File`,
      body: `Select a folder to where you want to ${mode} the file`,
      buttonText: "Select folder",
      newFileName: sourcePath.substring(sourcePath.lastIndexOf("/") + 1),
    },
    false
  );
  if (!filePickerRes.ok) {
    // User cancelled.
    return;
  }

  const destinationPath = filePickerRes.result as string;
  const res = await makeRequest("/admin-panel/api/files", "PATCH", {
    mode: `${mode}-single`,
    source: sourcePath,
    destination: destinationPath,
  });

  if (!res.ok) {
    handleRequestError(res);
    return;
  }

  const action = mode == "copy" ? "copied" : "moved";
  notification(
    `${captitalise(action)} File`,
    `Successfully ${action} file <code>${sourcePath}</code> to <code>${destinationPath}</code>`
  );

  // Refresh files.
  showFiles(new URLSearchParams(document.location.search).get("path")!);
};

/*

  4.7 Rename File

*/

const renameFile = async (sourcePath: string) => {
  const popupRes = await popup(
    `Renaming File`,
    `Enter a new name for <code>${sourcePath.substring(
      sourcePath.lastIndexOf("/") + 1
    )}</code>`,
    [
      {
        name: "Rename",
      },
    ],
    [
      {
        name: "new-name",
        placeholder: "Enter a new name...",
        type: "text",
        value: sourcePath.substring(sourcePath.lastIndexOf("/") + 1),
        enterTriggersButton: "Rename",
      },
    ]
  );

  if (popupRes.buttonName == "Rename") {
    const newName = popupRes.inputs.get("new-name");
    const dirPath = sourcePath.substring(0, sourcePath.lastIndexOf("/") + 1);
    const destinationPath = dirPath + newName;

    const res = await makeRequest("/admin-panel/api/files", "PATCH", {
      mode: "move-single",
      source: sourcePath,
      destination: destinationPath,
    });

    if (!res.ok) {
      handleRequestError(res);
      return;
    }

    notification(
      `Renamed file`,
      `Successfully renamed file <code>${sourcePath}</code> to <code>${destinationPath}</code>`
    );

    // Refresh files.
    showFiles(new URLSearchParams(document.location.search).get("path")!);
  }
};

/*

  4.8 Create New Directory

*/

const createNewDirectory = async (parentDirectoryPath: string) => {
  const popupRes = await popup(
    "New Folder",
    `Creating a new folder in <code>${parentDirectoryPath}</code>`,
    [
      {
        name: "Create",
      },
    ],
    [
      {
        name: "new-dir-name",
        placeholder: "Enter a name...",
        type: "text",
        enterTriggersButton: "Create",
      },
    ]
  );

  const newDirName = popupRes.inputs.get("new-dir-name");
  if (newDirName == "") {
    notification("Error", "Please enter a name for the new directory.");
    return;
  }

  const path = parentDirectoryPath + newDirName;
  const res = await makeRequest("/admin-panel/api/files/directory", "POST", {
    path,
  });

  if (!res.ok) {
    handleRequestError(res);
    return;
  }

  notification(
    `Created directory`,
    `Successfully created directory <code>${newDirName}</code>`
  );

  // Refresh files.
  showFiles(new URLSearchParams(document.location.search).get("path")!);
};

/* ===================
  5. Database manager
=================== */

// Unavailable. Might return in the future.

/* ===================
  6. User Management
=================== */

interface User {
  id: number;
  name: string;
}

/*
  6.1 Fetch Users
*/

const fetchUsers = async () => {
  const result = await makeRequest("/admin-panel/api/users", "GET");
  if (!result.ok) {
    handleRequestError(result);
    return undefined;
  }

  return result.body as User[];
};

/*
  6.2 Show User Management Panel
*/

const showUserManagement = async () => {
  showLoader();

  const users = await fetchUsers();
  if (users === undefined) {
    return;
  }

  $(".main").innerHTML = /* html */ `
  <h1>Users</h1>

  <div class="table-container">
    <table class="fullwidth">
      <thead>
        <tr>
          <td class="col-id">User ID</td>
          <td class="col-name">Username</td>
          <td class="col-options"></td>
        </tr>
      </thead>
      <tbody>
      ${reduceArray(
        users,
        (user) => /* html */ `
        <tr>
          <td class="col-id">${user.id}</td>
          <td class="col-name">${user.name}</td>
          <td class="col-options">
            <button class="small" onclick="changePassword(${user.id}, '${user.name}')">Change Password</button>
            <button class="small red" onclick="deleteUser(${user.id}, '${user.name}')">Delete</button>
          </td>
        </tr>
        `
      )}
      </tbody>
    </table>
  </div>
  <br>
  <button class="small" onclick="addUser()">Add User</button>
  `;

  setSearchParams({
    tab: "user-management",
  });
};

/*
  6.3 Change User's Password
*/

const changePassword = async (username: string) => {
  const popupRes = await popup(
    "Changing Password",
    `Enter a new password for user ${username}`,
    [
      {
        name: "Enter",
      },
    ],
    [
      {
        name: "password",
        placeholder: "Enter a new password...",
        type: "password",
      },
      {
        name: "confirmed-password",
        placeholder: "Confirm the new password...",
        type: "password",
        enterTriggersButton: "Enter",
      },
    ]
  );

  const newPassword = popupRes.inputs.get("password");
  const confirmedPassword = popupRes.inputs.get("confirmed-password");

  if (newPassword !== confirmedPassword) {
    notification(
      "Error",
      "The passwords you entered did not match. Please try again."
    );
    return;
  }

  const res = await makeRequest("/admin-panel/api/users", "PATCH", {
    username,
    newPassword,
  });
  if (!res.ok) {
    handleRequestError(res);
    return;
  }

  notification(
    "Changed Password",
    `Successfully changed ${username}'s password!`
  );
};

/*
  6.4 Delete User
*/

const deleteUser = async (username: string) => {
  const popupRes = await popup(
    "Deleting User",
    `Are you sure you want to delete user ${username}?`,
    [
      {
        name: "Delete User",
        classes: ["red"],
      },
      {
        name: "Cancel",
      },
    ]
  );

  if (popupRes.buttonName == "Delete User") {
    const res = await makeRequest("/admin-panel/api/users", "DELETE", {
      username,
    });
    if (!res.ok) {
      handleRequestError(res);
      return;
    }

    showUserManagement();
  }
};

/*
  6.5 Add User
*/

const addUser = async () => {
  const popupRes = await popup(
    "Adding User",
    "Please fill out the details of the new user.",
    [
      {
        name: "Add User",
      },
    ],
    [
      {
        name: "username",
        type: "text",
        placeholder: "Enter username...",
      },
      {
        name: "password",
        type: "password",
        placeholder: "Enter password...",
      },
      {
        name: "confirmed-password",
        type: "password",
        placeholder: "Confirm password...",
      },
    ]
  );

  const username = popupRes.inputs.get("username");
  const password = popupRes.inputs.get("password");
  const confirmedPassword = popupRes.inputs.get("confirmed-password");

  if (password == confirmedPassword) {
    notification(
      "Error",
      "The passwords you entered did not match. Please try again."
    );
    return;
  }

  const res = await makeRequest("/admin-panel/api/users", "POST", {
    username,
    password,
  });
  if (!res.ok) {
    handleRequestError(res);
    return;
  }

  showUserManagement();
};
