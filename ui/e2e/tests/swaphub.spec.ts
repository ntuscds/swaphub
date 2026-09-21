import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const commonCore = [
  "CC0001",
  "CC0002",
  "CC0003",
  "CC0005",
  "CC0007",
  "CC0008",
  "CC0015",
  "ML0004",
];

type Account = {
  email: string;
  username: string;
  telegram: string;
  telegramId: string;
  school: string;
  have: string;
  wants: string[];
  includeAB1201?: boolean;
};

const accounts: Account[] = [
  { email: "albert_ccds@e.ntu.edu.sg", username: "albert_ccds", telegram: "tele_albert", telegramId: "1000000000", school: "CCDS", have: "1", wants: ["2"], includeAB1201: true },
  { email: "bob_nbs@ntu.edu.sg", username: "bob_nbs", telegram: "tele_bob", telegramId: "2000000000", school: "NBS", have: "2", wants: ["1"], includeAB1201: true },
  { email: "carl_ccds@ntu.edu.sg", username: "carl_ccds", telegram: "tele_carl", telegramId: "3000000000", school: "CCDS", have: "2", wants: ["1", "3"], includeAB1201: true },
  { email: "derrick_ccds@ntu.edu.sg", username: "derrick_ccds", telegram: "tele_derrick", telegramId: "4000000000", school: "CCDS", have: "3", wants: ["1"], includeAB1201: true },
  { email: "emily_mae@ntu.edu.sg", username: "emily_mae", telegram: "tele_emily", telegramId: "5000000000", school: "MAE", have: "2", wants: ["1"] },
  { email: "frank_mae@ntu.edu.sg", username: "frank_mae", telegram: "tele_frank", telegramId: "6000000000", school: "MAE", have: "2", wants: ["1"] },
  { email: "george_spms@ntu.edu.sg", username: "george_spms", telegram: "tele_george", telegramId: "7000000000", school: "SPMS", have: "2", wants: ["1"] },
  { email: "hellen_spms@ntu.edu.sg", username: "hellen_spms", telegram: "tele_hellen", telegramId: "8000000000", school: "SPMS", have: "2", wants: ["1"] },
  { email: "ian_spms@ntu.edu.sg", username: "ian_spms", telegram: "tele_ian", telegramId: "9000000000", school: "SPMS", have: "2", wants: ["1"] },
  { email: "jack_spms@ntu.edu.sg", username: "jack_spms", telegram: "tele_jack", telegramId: "10000000000", school: "SSS", have: "2", wants: ["1"] },
];

async function logoutIfNeeded(page: Page) {
  await page.goto("/onboard");
  const accountMenu = page.getByRole("button", { name: "Account menu" });
  if (await accountMenu.isVisible().catch(() => false)) {
    await accountMenu.click();
    await page.getByText("Log out", { exact: true }).click();
    await expect(page).toHaveURL(/\/onboard/);
  }
}

async function signIn(page: Page, email: string) {
  await logoutIfNeeded(page);
  const signInHeading = page.getByRole("heading", { name: "E2E Microsoft sign-in" });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.getByRole("button", { name: "Sign in with Microsoft" }).click();
    if (await signInHeading.waitFor({ state: "visible", timeout: 2_000 }).then(() => true).catch(() => false)) break;
  }
  await expect(signInHeading).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Continue" }).click();
}

async function chooseCombobox(page: Page, label: string, value: string) {
  const input = page.getByLabel(label);
  await page.keyboard.press("Escape");
  await input.click();
  await input.fill(value);
  await page.getByRole("option", { name: value, exact: true }).last().click();
}

async function createSwap(page: Page, code: string, have: string, wants: string[]) {
  await page.goto(`/swap/${code}/edit`);
  await page.getByRole("button", { name: "Have index" }).click();
  await page.getByRole("option", { name: have, exact: true }).last().click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Wanted indexes" }).click();
  for (const want of wants) {
    await page.getByRole("option", { name: want, exact: true }).last().click();
  }
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Request", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/swap/${code}$`));
}

async function onboard(page: Page, account: Account, invalidSchoolFirst = false) {
  await signIn(page, account.email);
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Link Telegram" }).click();
  const telegram = await popupPromise;
  await telegram.getByLabel("Telegram username").fill(account.telegram);
  await telegram.getByLabel("Telegram user ID").fill(account.telegramId);
  await telegram.getByRole("button", { name: "Link account" }).click();
  await expect(telegram.getByRole("heading", { name: "Telegram account linked" })).toBeVisible();
  await telegram.close();

  await expect(page.getByLabel("How should we call you?")).toBeVisible();
  await page.getByLabel("How should we call you?").fill(account.username);
  if (invalidSchoolFirst) {
    await page.getByLabel("Which School are you from?").fill("SPSM2");
    await page.locator("form").evaluate((form: HTMLFormElement) => form.requestSubmit());
    await expect(page.getByText("School is required")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("How should we call you?")).toBeVisible();
    await page.getByLabel("How should we call you?").fill(account.username);
  }
  await chooseCombobox(page, "Which School are you from?", account.school);
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page).toHaveURL(/\/swap$/);

  for (const code of commonCore) await createSwap(page, code, account.have, account.wants);
  if (account.includeAB1201) await createSwap(page, "AB1201", account.have, account.wants);
}

async function expectParticipants(page: Page, code: string, expectedCounts: Record<string, number>, absent: string[]) {
  await page.goto(`/swap/${code}`);
  for (const [username, count] of Object.entries(expectedCounts)) {
    await expect(page.locator(`img[alt="${username}"]:visible`)).toHaveCount(count);
  }
  for (const username of absent) await expect(page.locator(`img[alt="${username}"]:visible`)).toHaveCount(0);
}

async function outbox(page: Page, telegramId: string) {
  const response = await page.request.get(`/api/e2e/telegram/outbox?telegramUserId=${telegramId}`);
  expect(response.ok()).toBeTruthy();
  return (await response.json()).messages as Array<{ text: string; options?: any }>;
}

async function clearOutbox(page: Page, telegramId: string) {
  const response = await page.request.delete(`/api/e2e/telegram/outbox?telegramUserId=${telegramId}`);
  expect(response.ok()).toBeTruthy();
}

function messageFor(messages: Array<{ text: string; options?: any }>, courseCode: string) {
  const message = [...messages].reverse().find((item) => item.text.includes(courseCode));
  expect(message, `Telegram message for ${courseCode}`).toBeTruthy();
  return message!;
}

function messageUrl(message: { options?: any }) {
  const url = message.options?.reply_markup?.inline_keyboard?.[0]?.[0]?.web_app?.url;
  expect(url).toBeTruthy();
  return url as string;
}

function requestMessageUrl(
  messages: Array<{ text: string; options?: any }>,
  courseCode: string
) {
  const message = [...messages].reverse().find((item) => {
    const url = item.options?.reply_markup?.inline_keyboard?.[0]?.[0]?.web_app?.url;
    return item.text.includes(courseCode) && Boolean(url);
  });
  expect(message, `Telegram request message for ${courseCode}`).toBeTruthy();
  return messageUrl(message!);
}

async function sendMatch(page: Page, code: string, participants: string[]) {
  await page.goto(`/swap/${code}`);
  let row = page.locator("tr:visible");
  for (const participant of participants) row = row.filter({ has: page.locator(`img[alt="${participant}"]`) });
  for (const account of accounts) {
    if (!participants.includes(account.username)) {
      row = row.filter({ hasNot: page.locator(`img[alt="${account.username}"]`) });
    }
  }
  await row.click();
  await page.getByRole("button", { name: "Request Swap" }).click();
  await expect(page.getByText("Swap request sent successfully!")).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
}

async function editSchool(page: Page, school: string) {
  await page.goto("/profile");
  await page.getByRole("button", { name: "Edit" }).click();
  await chooseCombobox(page, "School", school);
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByText(school, { exact: true })).toBeVisible();
}

test.describe.serial("SwapHub full E2E", () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => context.close());

  test("rejects john@gmail.com", async () => {
    await signIn(page, "john@gmail.com");
    await expect(page.getByText("Oh no! Please sign in with your @e.ntu.edu.sg account.")).toBeVisible();
  });

  test("rejects john@s.ntu.edu.sg", async () => {
    await signIn(page, "john@s.ntu.edu.sg");
    await expect(page.getByText("Oh no! Please sign in with your @e.ntu.edu.sg account.")).toBeVisible();
  });

  for (const account of accounts) {
    test(`onboards ${account.username} and creates course requests`, async () => {
      await onboard(page, account, account.username === "george_spms");
    });
  }

  test("shows only the specified common-core and AB1201 matches", async () => {
    await signIn(page, accounts[0].email);
    for (const code of commonCore) {
      await expectParticipants(page, code, { carl_ccds: 2, derrick_ccds: 1 }, ["bob_nbs", "emily_mae", "frank_mae", "george_spms", "hellen_spms", "ian_spms", "jack_spms"]);
    }
    await expectParticipants(page, "AB1201", { bob_nbs: 1, carl_ccds: 2, derrick_ccds: 1 }, []);

    await signIn(page, accounts[2].email);
    for (const code of commonCore) await expectParticipants(page, code, { albert_ccds: 2, derrick_ccds: 1 }, ["bob_nbs"]);
    await expectParticipants(page, "AB1201", { albert_ccds: 2, derrick_ccds: 1 }, ["bob_nbs"]);

    await signIn(page, accounts[3].email);
    for (const code of commonCore) await expectParticipants(page, code, { albert_ccds: 1, carl_ccds: 1 }, ["bob_nbs"]);
    await expectParticipants(page, "AB1201", { albert_ccds: 1, carl_ccds: 1 }, ["bob_nbs"]);
  });

  test("handles direct request notifications, school changes, accept, and decline", async () => {
    await clearOutbox(page, accounts[0].telegramId);
    await clearOutbox(page, accounts[2].telegramId);
    await signIn(page, accounts[0].email);
    await sendMatch(page, "CC0001", ["carl_ccds"]);
    await sendMatch(page, "CC0002", ["carl_ccds"]);
    const carlMessages = await outbox(page, accounts[2].telegramId);
    const cc1 = messageFor(carlMessages, "CC0001");
    const cc2 = messageFor(carlMessages, "CC0002");

    await signIn(page, accounts[2].email);
    await page.goto("/swap/CC0001");
    await expect(page.getByText("Requested by Someone!").filter({ visible: true })).toBeVisible();
    await editSchool(page, "NBS");
    await page.goto("/swap/CC0001");
    await expect(page.getByText("Requested by Someone!").filter({ visible: true })).toBeVisible();
    await page.goto(messageUrl(cc1));
    await page.getByRole("button", { name: "Accept" }).click();
    await expect(page.getByText("Request accepted successfully.")).toBeVisible();
    expect(messageFor(await outbox(page, accounts[0].telegramId), "CC0001").text.toLowerCase()).toContain("accept");
    await page.goto("/swap/CC0001");
    await expect(page.getByText("You have already Swapped!").filter({ visible: true })).toBeVisible();
    await page.getByRole("button", { name: "Disabled" }).click();
    await page.getByText("Yes, Enabled", { exact: true }).click();
    await expect(page.getByText("No matches yet!", { exact: true }).filter({ visible: true })).toBeVisible();

    await page.goto("/swap/CC0003");
    await expect(page.getByText("No matches yet!", { exact: true }).filter({ visible: true })).toBeVisible();
    await editSchool(page, "CCDS");
    await page.goto("/swap/CC0003");
    await expect(page.locator('img[alt="albert_ccds"]')).not.toHaveCount(0);

    await page.goto(messageUrl(cc2));
    await page.getByRole("button", { name: "Decline" }).click();
    await page.getByText("Decline This Request", { exact: true }).click();
    await expect(page.getByText("Request declined successfully.")).toBeVisible();
    expect(messageFor(await outbox(page, accounts[0].telegramId), "CC0002").text.toLowerCase()).toContain("declin");
    await page.goto("/swap/CC0002");
    await expect(page.locator('img[alt="albert_ccds"]')).not.toHaveCount(0);
  });

  test("handles the complete three-way lifecycle and notifications", async () => {
    await clearOutbox(page, accounts[0].telegramId);
    await clearOutbox(page, accounts[2].telegramId);
    await clearOutbox(page, accounts[3].telegramId);
    await signIn(page, accounts[0].email);
    for (const code of ["ML0004", "CC0015", "CC0008", "CC0007"]) {
      await sendMatch(page, code, ["carl_ccds", "derrick_ccds"]);
    }
    let carlMessages = await outbox(page, accounts[2].telegramId);
    let derrickMessages = await outbox(page, accounts[3].telegramId);
    for (const code of ["ML0004", "CC0015", "CC0008", "CC0007"]) {
      messageFor(carlMessages, code);
      messageFor(derrickMessages, code);
    }

    await page.goto("/swap/CC0007");
    await page.getByRole("button", { name: "Enabled" }).click();
    await page.getByText("No, Disabled", { exact: true }).click();
    await expect(page.getByText(/This will decline 1 active request/)).toBeVisible();
    await page.getByRole("button", { name: "Disable", exact: true }).click();
    await expect(page.getByRole("button", { name: "Disabled" })).toBeVisible();
    await expect(page.getByText("You have already Swapped!").filter({ visible: true })).toBeVisible();
    carlMessages = await outbox(page, accounts[2].telegramId);
    derrickMessages = await outbox(page, accounts[3].telegramId);
    expect(messageFor(carlMessages, "CC0007").text).toContain("no longer");
    expect(messageFor(derrickMessages, "CC0007").text).toContain("no longer");

    await signIn(page, accounts[3].email);
    await page.goto(messageUrl(messageFor(derrickMessages, "CC0015")));
    await page.getByRole("button", { name: "Decline" }).click();
    await page.getByText("Decline This Request", { exact: true }).click();
    await expect(page.getByText("Request declined successfully.")).toBeVisible();
    let albertMessages = await outbox(page, accounts[0].telegramId);
    carlMessages = await outbox(page, accounts[2].telegramId);
    expect(messageFor(albertMessages, "CC0015").text.toLowerCase()).toContain("declin");
    expect(messageFor(carlMessages, "CC0015").text.toLowerCase()).toContain("declin");
    await page.goto("/swap/CC0015");
    await expect(page.locator('img[alt="albert_ccds"]')).not.toHaveCount(0);
    await page.goto(messageUrl(messageFor(derrickMessages, "ML0004")));
    await page.getByRole("button", { name: "Accept" }).click();
    await expect(page.getByText("Request accepted successfully.")).toBeVisible();
    albertMessages = await outbox(page, accounts[0].telegramId);
    carlMessages = await outbox(page, accounts[2].telegramId);
    expect(messageFor(albertMessages, "ML0004").text.toLowerCase()).toContain("accept");
    expect(messageFor(carlMessages, "ML0004").text.toLowerCase()).toContain("accept");
    await page.goto("/swap/ML0004");
    await expect(page.getByText("Requested by Someone!").filter({ visible: true })).toBeVisible();
    await expect(page.getByText("You have already Swapped!")).toHaveCount(0);
    await page.goto("/swap/CC0008");
    await expect(page.getByText("Requested by Someone!").filter({ visible: true })).toBeVisible();
    await page.goto("/swap/CC0007");
    await expect(page.getByText("No matches yet!", { exact: true }).filter({ visible: true })).toBeVisible();

    await signIn(page, accounts[2].email);
    carlMessages = await outbox(page, accounts[2].telegramId);
    await page.goto(messageUrl(messageFor(carlMessages, "CC0008")));
    await page.getByRole("button", { name: "Decline" }).click();
    await page.getByText("Decline This Request", { exact: true }).click();
    await expect(page.getByText("Request declined successfully.")).toBeVisible();
    albertMessages = await outbox(page, accounts[0].telegramId);
    derrickMessages = await outbox(page, accounts[3].telegramId);
    expect(messageFor(albertMessages, "CC0008").text.toLowerCase()).toContain("declin");
    expect(messageFor(derrickMessages, "CC0008").text.toLowerCase()).toContain("declin");
    await page.goto("/swap/CC0008");
    await expect(page.locator('img[alt="albert_ccds"]')).not.toHaveCount(0);
    await page.goto(requestMessageUrl(carlMessages, "ML0004"));
    await page.getByRole("button", { name: "Accept" }).click();
    await expect(page.getByText("Request accepted successfully.")).toBeVisible();
    albertMessages = await outbox(page, accounts[0].telegramId);
    derrickMessages = await outbox(page, accounts[3].telegramId);
    expect(messageFor(albertMessages, "ML0004").text.toLowerCase()).toContain("accepted");
    expect(messageFor(derrickMessages, "ML0004").text.toLowerCase()).toContain("accepted");
    await page.goto("/swap/ML0004");
    await expect(page.getByText("You have already Swapped!").filter({ visible: true })).toBeVisible();
    await page.goto("/swap/CC0015");
    await expect(page.locator('img[alt="albert_ccds"]')).not.toHaveCount(0);
    await page.goto("/swap/CC0007");
    await expect(page.getByText("No matches yet!", { exact: true }).filter({ visible: true })).toBeVisible();

    await signIn(page, accounts[0].email);
    await page.goto("/swap/ML0004");
    await expect(page.getByText("You have already Swapped!").filter({ visible: true })).toBeVisible();
    for (const code of ["CC0015", "CC0008"]) {
      await page.goto(`/swap/${code}`);
      await expect(page.locator('img[alt="carl_ccds"]')).not.toHaveCount(0);
    }

    await signIn(page, accounts[3].email);
    await page.goto("/swap/ML0004");
    await expect(page.getByText("You have already Swapped!").filter({ visible: true })).toBeVisible();
    await page.goto("/swap/CC0008");
    await expect(page.locator('img[alt="albert_ccds"]')).not.toHaveCount(0);
  });
});
