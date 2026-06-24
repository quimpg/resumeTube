"use strict";

const apiKeyEl = document.getElementById("apiKey");
const modelEl = document.getElementById("model");
const savedEl = document.getElementById("saved");

async function load() {
  const { apiKey, model } = await chrome.storage.local.get(["apiKey", "model"]);
  if (apiKey) apiKeyEl.value = apiKey;
  if (model) modelEl.value = model;
}

document.getElementById("save").addEventListener("click", async () => {
  await chrome.storage.local.set({
    apiKey: apiKeyEl.value.trim(),
    model: modelEl.value,
  });
  savedEl.hidden = false;
  setTimeout(() => {
    savedEl.hidden = true;
  }, 1500);
});

load();
