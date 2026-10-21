import assert from "node:assert/strict";
import test from "node:test";
import { failureDetails } from "../scripts/g1/failure.mjs";
import { G1Error } from "../scripts/g1/client.mjs";

test("assertion diagnostics show rejection status and source locations without private values",()=>{
  const error=new assert.AssertionError({actual:new G1Error(403),expected:"sensitive value"});
  error.stack="sensitive session\n at denied (/workspace/scripts/g1/verify.mjs:29:3)\n at async /workspace/scripts/g1/verify.mjs:96:5";
  error.actual.message="sensitive upstream response";
  assert.equal(failureDetails(error),"ASSERTION rejected HTTP 403 at verify.mjs:29:3 <- verify.mjs:96:5");
  assert.equal(failureDetails(new TypeError("sensitive runtime message")),"TypeError");
  assert.equal(failureDetails(new G1Error(403,"sensitive-code")),"HTTP 403");
});
