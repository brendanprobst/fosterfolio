import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";

// AWS SES SMTP passwords are an HMAC of the IAM secret access key.
// https://docs.aws.amazon.com/ses/latest/dg/smtp-credentials.html
const input = JSON.parse(readFileSync(0, "utf8"));

function sign(key, message) {
  return createHmac("sha256", key).update(message, "utf8").digest();
}

let signature = sign(Buffer.from(`AWS4${input.secret}`, "utf8"), "11111111");
signature = sign(signature, input.region);
signature = sign(signature, "ses");
signature = sign(signature, "aws4_request");
signature = sign(signature, "SendRawEmail");

const password = Buffer.concat([Buffer.from([0x04]), signature]).toString("base64");
process.stdout.write(JSON.stringify({ password }));
