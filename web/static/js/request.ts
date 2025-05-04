type MakeRequestResult = {
  ok: boolean;
  status: number;
  body: any;
};

const makeRequest = async (
  url: string,
  method: string,
  body?: Object,
  settings?: { stream?: boolean; disableAuth?: boolean }
): Promise<MakeRequestResult> => {
  const headers: Record<string, string> = {};
  headers["Accept"] = "application/json";
  headers["Content-Type"] = "application/json";
  if (settings?.disableAuth !== true) {
    headers["Authorization"] = `Bearer ${await getSuToken()}`;
  }
  const jsonBody = body !== undefined ? JSON.stringify(body) : undefined;
  const res = await fetch(url, { method, headers, body: jsonBody });
  if (!res.ok) {
    try {
      const json = await res.json();
      return { ok: false, status: res.status, body: json };
    } catch (err) {
      return { ok: false, status: res.status, body: res.statusText };
    }
  }
  return {
    ok: true,
    status: res.status,
    body: settings?.stream === true ? res.body : await res.json(),
  };
};

type DoFileUploadEventListeners = {
  onRequestUploadProgress: (e: ProgressEvent<EventTarget>) => void;
};

const doFileUpload = (
  url: string,
  path: string,
  files: File[] = [],
  eventListeners: DoFileUploadEventListeners
) =>
  new Promise<MakeRequestResult>(async (resolve) => {
    const req = new XMLHttpRequest();
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append(`file_${i}`, files[i]);
    }
    formData.append("path", path);

    req.onreadystatechange = () => {
      if (req.readyState == 4) {
        if (req.status >= 200 && req.status < 300) {
          resolve({ ok: true, status: req.status, body: req.response });
        } else {
          resolve({ ok: false, status: req.status, body: req.response });
        }
      }
    };

    if (eventListeners != null) {
      req.upload.onprogress = (e) => eventListeners.onRequestUploadProgress(e);
    }

    req.open("POST", url);
    req.setRequestHeader("Accept", "application/json");
    req.setRequestHeader("Authorization", `Bearer ${await getSuToken()}`);
    req.send(formData);
    console.log("Request sent", url, path, formData);
  });

const handleRequestError = (err: { status: number; body: any }) => {
  if (err.status == 403) {
    // Probably a session timeout.
    localStorage.removeItem("token");
    setPadlock("locked");
    notification("Session Timed Out", "Please retry.");
  } else {
    // Unhandled error.
    const errMsg = err.body.error !== undefined ? err.body.error : err.body;
    const errMsgHtml = errMsg.replace(/\n/g, "<br>");
    notification(
      "Unhandled Error",
      `status code: ${err.status}, body: <codeblock>${errMsgHtml}</codeblock>`,
      undefined
    );
  }
};
