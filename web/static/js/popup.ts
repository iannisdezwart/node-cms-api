interface PopupButton {
  name: string;
  classes?: string[];
  on?: {
    [key in keyof HTMLElementEventMap]?: (e: HTMLElementEventMap[key]) => any;
  };
  resolvesPopup?: boolean;
}

interface PopupInput {
  name: string;
  placeholder?: string;
  value?: string;
  type:
    | "button"
    | "checkbox"
    | "color"
    | "date"
    | "datetime-local"
    | "email"
    | "file"
    | "hidden"
    | "image"
    | "month"
    | "number"
    | "password"
    | "radio"
    | "range"
    | "reset"
    | "search"
    | "submit"
    | "tel"
    | "text"
    | "time"
    | "url"
    | "week";
  enterTriggersButton?: string;
}

interface PopupResult {
  buttonName: string;
  inputs: Map<string, string>;
}

const logPopup = (title: string) => {
  const popupEl = document.createElement("div");

  popupEl.classList.add("popup");

  popupEl.innerHTML = /* html */ `
    <h1 class="popup-title">${title}</h1>
    <pre class="popup-log-body"></pre>
  `;

  // Add popup to the page

  document.body.appendChild(popupEl);

  return (bodyChunk?: string) => {
    // Close popup when body is empty

    if (bodyChunk == null) {
      popupEl.classList.add("closed");
      setTimeout(() => {
        popupEl.remove();
      }, 300);

      return;
    }

    // Provide the body chunk to the popup

    const popupLogBody = popupEl.$(".popup-log-body") as HTMLPreElement;
    popupLogBody.innerHTML += bodyChunk;

    // Scroll to the bottom

    popupLogBody.scrollTop = popupLogBody.scrollHeight;
  };
};

const popup = (
  title: string,
  body: string,
  buttons: PopupButton[] = [],
  inputs: PopupInput[] = [],
  disappearsAfterMs?: number
) =>
  new Promise<PopupResult>((resolve) => {
    const popupEl = document.createElement("div");
    popupEl.classList.add("popup");

    popupEl.innerHTML = /* html */ `
      <a class="popup-close-button">✕</a>
      <h1 class="popup-title">${title}</h1>
      <p class="popup-body">${body}</p>
    `;

    // Add popup to the page.
    document.body.appendChild(popupEl);

    const getInputValues = () => {
      const inputResults = new Map<string, string>();

      for (let input of inputs) {
        const { value } = popupEl.$<HTMLInputElement>(
          `input[data-name="${input.name}"]`
        );
        inputResults.set(input.name, value);
      }

      return inputResults;
    };

    const removePopup = () => {
      popupEl.classList.add("closed");
      setTimeout(() => {
        popupEl.remove();
      }, 300);
    };

    const submitPopup = (buttonName: string) => {
      const inputResults = getInputValues();
      removePopup();
      resolve({
        buttonName,
        inputs: inputResults,
      });
    };

    for (let input of inputs) {
      const inputEl = document.createElement("input");
      popupEl.appendChild(inputEl);
      inputEl.type = input.type;
      if (input.placeholder != undefined) {
        inputEl.placeholder = input.placeholder;
      }
      inputEl.setAttribute("data-name", input.name);

      // Create random ID in order to find the dynamically added element later on.
      const randomId = randomString(10);
      inputEl.setAttribute("data-id", randomId);

      // TODO: fix this bug: the value is not shown.
      if (input.value !== undefined) {
        // html value="X" will set the default value, js el.value does not work.
        inputEl.setAttribute("value", input.value);
      }

      popupEl.innerHTML += /* html */ `
      <br><br>
      `;

      const enterTriggersButton = input.enterTriggersButton;
      if (enterTriggersButton !== undefined) {
        if (
          buttons.map((button) => button.name).includes(enterTriggersButton)
        ) {
          addEventListener("keyup", (e) => {
            const target = e.target as HTMLElement;

            if (target.getAttribute("data-id") == randomId) {
              if (e.key == "Enter") {
                submitPopup(enterTriggersButton);
              }
            }
          });
        }
      }
    }

    for (let button of buttons) {
      const buttonEl = document.createElement("button");
      buttonEl.innerHTML = button.name;

      if (button.classes != undefined) {
        for (let className of button.classes) {
          buttonEl.classList.add(className);
        }
      }
      buttonEl.classList.add("small");

      if (button.on != undefined) {
        let event: keyof HTMLElementEventMap;
        for (event in button.on) {
          const f = button.on[event];
          if (f !== undefined) {
            buttonEl.addEventListener(event, (e) => f(e as any));
          }
        }
      }

      // Resolve on click.
      if (button.resolvesPopup != false) {
        buttonEl.addEventListener("click", () => {
          const inputResults = getInputValues();
          removePopup();
          resolve({
            buttonName: button.name,
            inputs: inputResults,
          });
        });
      }

      popupEl.appendChild(buttonEl);
    }

    // Close popup when x button or escape is pressed.
    popupEl.$("a.popup-close-button").addEventListener("click", () => {
      removePopup();
    });

    const escapePressHandler = (e: KeyboardEvent) => {
      if (e.key == "Escape") {
        removePopup();
        removeEventListener("keyup", escapePressHandler);
      }
    };

    addEventListener("keyup", escapePressHandler);

    if (disappearsAfterMs != undefined) {
      setTimeout(() => {
        removePopup();
      }, disappearsAfterMs);
    }
  });

const notification = (
  title: string,
  body: string,
  disappearsAfterMs: number = 3000
) => {
  popup(title, body, [], [], disappearsAfterMs);
};

class ProgressBar {
  el: HTMLDivElement;
  inner: HTMLDivElement;

  constructor(startingRatio = 0) {
    this.el = document.createElement("div");
    this.el.classList.add("progress-bar");
    this.inner = document.createElement("div");
    this.inner.classList.add("inner");
    this.inner.style.width = `${startingRatio * 100}%`;
    this.el.appendChild(this.inner);
    document.body.appendChild(this.el);
  }

  set(newRatio: number) {
    this.inner.style.width = `${newRatio * 100}%`;
  }

  remove() {
    this.el.remove();
  }
}
