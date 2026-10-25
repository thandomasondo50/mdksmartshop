/**
 * MDK Smart Shop — form + quotation handler (Google Apps Script)
 *
 * What it does
 *  - Receives enquiries, special orders and quotations from the website
 *  - Saves each one as a row in this spreadsheet (tabs: Enquiries, Special Orders, Quotes)
 *  - Emails the customer an automatic reply
 *  - Emails the shop owner a notification
 *
 * Setup: see README.md, step 2.
 */
var SHOP_NAME  = "MDK Smart Shop";
var OWNER_EMAIL = "tpy.media0@gmail.com";   // where notifications go
var SHOP_PHONE = "064 987 0578";
var SHOP_ADDRESS = "8679 Tshepo Street, Grinacker, Tokoza, South Africa, 1426";

// Same banking details as assets/js/config.js — keep them identical.
var BANK = {
  bank: "STANDARD BANK", accountName: "MDK SMART SHOP", accountNumber: "10108029083",
  accountType: "Savings", branchCode: "51001"
};

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    if (d.type === "enquiry") handleEnquiry(d);
    else if (d.type === "special_order") handleSpecial(d);
    else if (d.type === "quote") handleQuote(d);
    return ContentService.createTextOutput("ok");
  } catch (err) {
    console.error(err);
    return ContentService.createTextOutput("error");
  }
}
function doGet() { return ContentService.createTextOutput(SHOP_NAME + " form handler is running."); }

function sheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() === 0) { sh.appendRow(headers); sh.setFrozenRows(1); }
  return sh;
}
function clean_(v) { return String(v == null ? "" : v).replace(/[<>]/g, ""); }
function money_(n) { return "R " + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " "); }

function handleEnquiry(d) {
  sheet_("Enquiries", ["Received", "Name", "Phone", "Email", "Message"])
    .appendRow([new Date(), d.name, d.phone, d.email, d.message]);
  reply_(d.email, "We received your enquiry",
    "<p>Hi " + clean_(d.name) + ",</p><p>Thanks for contacting " + SHOP_NAME + ". We have received your message and will reply as soon as we can.</p>" +
    "<p><strong>Your message:</strong><br>" + clean_(d.message) + "</p>" + footer_());
  notify_("New enquiry from " + d.name, d);
}
function handleSpecial(d) {
  sheet_("Special Orders", ["Received", "Name", "Phone", "Email", "Product type", "Quantity", "Details"])
    .appendRow([new Date(), d.name, d.phone, d.email, d.product_type, d.quantity, d.details]);
  reply_(d.email, "We received your special order request",
    "<p>Hi " + clean_(d.name) + ",</p><p>Thanks for your special order request. We will look into it and come back to you with options and a price.</p>" +
    "<p><strong>You asked for:</strong> " + clean_(d.quantity) + " x " + clean_(d.product_type) + "<br>" + clean_(d.details) + "</p>" + footer_());
  notify_("New special order from " + d.name, d);
}
function handleQuote(d) {
  var q = d.quote;
  sheet_("Quotes", ["Received", "Quote no.", "Name", "Phone", "Email", "Payment", "Delivery", "Total", "Items", "Notes"])
    .appendRow([new Date(), q.no, q.customer.name, q.customer.phone, q.customer.email, q.payment, q.delivery, q.total,
      q.items.map(function (i) { return i.qty + " x " + i.name; }).join("; "), q.notes]);

  var rows = q.items.map(function (i) {
    return "<tr><td style='padding:6px 10px;border-bottom:1px solid #eee'>" + clean_(i.name) + "</td><td style='padding:6px 10px;border-bottom:1px solid #eee;text-align:right'>" + i.qty +
      "</td><td style='padding:6px 10px;border-bottom:1px solid #eee;text-align:right'>" + money_(i.line) + "</td></tr>";
  }).join("");
  var pay = q.payment === "eft"
    ? "<h3>Pay by EFT</h3><p>Bank: " + BANK.bank + "<br>Account holder: " + BANK.accountName + "<br>Account number: " + BANK.accountNumber +
      "<br>Account type: " + BANK.accountType + "<br>Branch code: " + BANK.branchCode + "<br><strong>Reference: " + clean_(q.no) + "</strong></p>" +
      "<p>Please send proof of payment to " + OWNER_EMAIL + " or on WhatsApp to " + SHOP_PHONE + ".</p>"
    : "<h3>Pay cash at our location</h3><p>" + SHOP_ADDRESS + "<br>Please quote " + clean_(q.no) + " when you collect and pay.</p>";
  var html = "<p>Hi " + clean_(q.customer.name) + ",</p><p>Thanks for your order request. Here is your quotation, valid for 7 days.</p>" +
    "<h2 style='color:#7E2F74'>Quotation " + clean_(q.no) + "</h2>" +
    "<table style='border-collapse:collapse;width:100%;max-width:560px'><tr><th align='left' style='padding:6px 10px;background:#FBF4FA'>Item</th><th align='right' style='padding:6px 10px;background:#FBF4FA'>Qty</th><th align='right' style='padding:6px 10px;background:#FBF4FA'>Amount</th></tr>" +
    rows + "<tr><td colspan='2' style='padding:10px;font-weight:bold'>Total</td><td align='right' style='padding:10px;font-weight:bold'>" + money_(q.total) + "</td></tr></table>" + pay + footer_();
  reply_(q.customer.email, "Your MDK Smart Shop quotation " + q.no, html);
  notify_("New quotation " + q.no + " (" + money_(q.total) + ")", { name: q.customer.name, phone: q.customer.phone, email: q.customer.email,
    payment: q.payment, delivery: q.delivery, items: q.items.map(function (i) { return i.qty + " x " + i.name; }).join("; "), notes: q.notes });
}

function footer_() {
  return "<p style='margin-top:24px;color:#675070'>" + SHOP_NAME + "<br>" + SHOP_ADDRESS + "<br>" + SHOP_PHONE + "</p>";
}
function reply_(to, subject, html) {
  if (!to) return;
  MailApp.sendEmail({ to: to, subject: subject, htmlBody: html, name: SHOP_NAME, replyTo: OWNER_EMAIL });
}
function notify_(subject, d) {
  var body = Object.keys(d).map(function (k) { return k + ": " + d[k]; }).join("\n");
  MailApp.sendEmail({ to: OWNER_EMAIL, subject: "[Website] " + subject, body: body, replyTo: d.email || OWNER_EMAIL });
}
