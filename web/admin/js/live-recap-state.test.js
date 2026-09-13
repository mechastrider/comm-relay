import assert from "node:assert/strict";
import test from "node:test";

import {
  beginRecapShow,
  canApplyRecapDialogResult,
  canApplyRecapRead,
  canCloseRecapDialog,
  cancelRecapConfirmation,
  closeRecapDialog,
  openRecapDialog,
  resolveRecapShowConflict,
} from "./live-recap-state.js";

test("only an immutable Show transition prevents closing the recap dialog", function () {
  const open = openRecapDialog();
  assert.equal(canCloseRecapDialog(Object.assign({}, open, { reading: true })), true);
  assert.equal(canCloseRecapDialog(Object.assign({}, open, { hiding: true })), true);
  assert.equal(canCloseRecapDialog(beginRecapShow(open)), false);
  assert.equal(closeRecapDialog(beginRecapShow(open)).open, true);
});

test("Show is single-flight and a stale conflict never schedules a resubmit", function () {
  const showing = beginRecapShow(openRecapDialog());
  assert.equal(beginRecapShow(showing), showing);
  const conflicted = resolveRecapShowConflict(showing);
  assert.equal(conflicted.showing, false);
  assert.equal(conflicted.confirmation, false);
  assert.equal(conflicted.resubmit, false);
});

test("cancel only clears confirmation and a late read cannot update a reopened dialog", function () {
  const opened = openRecapDialog();
  const cancelled = cancelRecapConfirmation(Object.assign({}, opened, { confirmation: true }));
  assert.equal(cancelled.confirmation, false);
  assert.equal(cancelled.request, null);

  const closed = closeRecapDialog(opened);
  const reopened = openRecapDialog(closed);
  assert.equal(canApplyRecapRead(reopened, opened.generation), false);
  assert.equal(canApplyRecapRead(reopened, reopened.generation), true);
});

test("a late Hide failure cannot update a reopened dialog", function () {
  const opened = openRecapDialog();
  const reopened = openRecapDialog(closeRecapDialog(opened));

  assert.equal(canApplyRecapDialogResult(reopened, opened.generation), false);
  assert.equal(canApplyRecapDialogResult(reopened, reopened.generation), true);
});
