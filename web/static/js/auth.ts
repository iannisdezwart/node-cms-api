const getSuToken = async (loginData?: {
  username: string;
  password: string;
}): Promise<string | undefined> => {
  if (localStorage.getItem("token") != undefined) {
    const body = parseJwt(localStorage.getItem("token")!);
    const exp = body.exp as number;

    if (exp > Date.now() / 1000) {
      setPadlock("unlocked");
      return localStorage.getItem("token")!;
    }

    setPadlock("locked");
    localStorage.removeItem("token");
  }

  if (loginData === undefined) {
    const { username, password } = await requestLoginData();
    return await getSuToken({ username, password });
  }

  const res = await makeRequest(
    "/admin-panel/api/auth/login",
    "POST",
    { loginData },
    { disableAuth: true }
  );
  if (!res.ok) {
    if (res.status == 403) {
      // Incorrect password.
      const { username, password } = await requestLoginData(true);
      return await getSuToken({ username, password });
    } else {
      handleRequestError(res);
      return undefined;
    }
  }

  // Open the padlock icon.
  setPadlock("unlocked");

  // Store the suToken.
  localStorage.setItem("token", res.body.token);
  return res.body.token;
};

const requestLoginData = async (incorrect = false) => {
  const title = incorrect ? "Incorrect Password" : "Authentication Required";
  const subtitle = incorrect
    ? "Please try again"
    : "Please enter your password";

  const popupResult = await popup(
    title,
    subtitle,
    [
      {
        name: "Submit",
      },
    ],
    [
      {
        name: "password",
        placeholder: "Enter your password...",
        type: "password",
        enterTriggersButton: "Submit",
      },
    ]
  );

  const password = popupResult.inputs.get("password")!;
  const username = localStorage.getItem("username")!;
  return { username, password };
};

const togglePadlock = async () => {
  if (localStorage.getItem("token") == null) {
    const suToken = await getSuToken();
    if (suToken != undefined) {
      setPadlock("unlocked");
    }
    return;
  }

  localStorage.removeItem("token");
  setPadlock("locked");
};

const setPadlock = (mode: "locked" | "unlocked") => {
  const padlockImage = $<HTMLImageElement>("#padlock > img");

  if (mode == "locked") {
    padlockImage.src = "/admin-panel/img/locked-padlock-orange.png";
    padlockImage.title =
      "You are currently not authorised to make changes, click here to gain permission";
  } else {
    padlockImage.src = "/admin-panel/img/unlocked-padlock-green.png";
    padlockImage.title = "You are currently authorised to make changes";
  }
};

const login = async (secondTry = false) => {
  const popupResult = await popup(
    "Login",
    secondTry
      ? "Incorrect password. "
      : "" + "Please enter your password to login",
    [
      {
        name: "Login",
      },
    ],
    [
      {
        name: "username",
        placeholder: "Username",
        enterTriggersButton: "Login",
        type: "text",
      },
      {
        name: "password",
        placeholder: "Password",
        enterTriggersButton: "Login",
        type: "password",
      },
    ]
  );

  const username = popupResult.inputs.get("username")!;
  const password = popupResult.inputs.get("password")!;

  const res = await makeRequest(
    "/admin-panel/api/auth/login",
    "POST",
    {
      username,
      password,
    },
    { disableAuth: true }
  );
  if (!res.ok) {
    if (res.status == 403) {
      // Let the user try to login again recursively
      await login(true);
    }

    handleRequestError(res);
    return;
  }

  localStorage.setItem("token", res.body.token);
  localStorage.setItem("username", username);

  await getSuToken({ username, password });
};

const logout = () => {
  localStorage.removeItem("username");
  localStorage.removeItem("token");
  window.location.reload();
};

const parseJwt = (token: string) => {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );

  return JSON.parse(jsonPayload);
};

const initPadlock = () => {
  if (localStorage.getItem("token") == null) {
    setPadlock("locked");
    return;
  }

  const body = parseJwt(localStorage.getItem("token")!);
  const exp = body.exp as number;

  if (exp > Date.now() / 1000) {
    setPadlock("unlocked");
  } else {
    setPadlock("locked");
  }
};
