import assert from "node:assert/strict";
import test from "node:test";
import {
  apiDateTimeToLocalInput,
  localInputToApiDateTime,
} from "../src/lib/dateTime.ts";

test("converts between API UTC and a datetime-local value without shifting the instant", () => {
  const previousTimezone = process.env.TZ;
  process.env.TZ = "Asia/Shanghai";

  try {
    assert.equal(
      apiDateTimeToLocalInput("2026-09-02T07:30:00Z"),
      "2026-09-02T15:30",
    );
    assert.equal(
      localInputToApiDateTime("2026-09-02T15:30"),
      "2026-09-02T07:30:00.000Z",
    );
  } finally {
    if (previousTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimezone;
  }
});

test("handles empty and invalid timestamps", () => {
  assert.equal(apiDateTimeToLocalInput(null), "");
  assert.equal(apiDateTimeToLocalInput("not-a-date"), "");
  assert.equal(localInputToApiDateTime(""), null);
  assert.equal(localInputToApiDateTime("not-a-date"), null);
});
