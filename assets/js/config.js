/* ==========================================================
   MDK Smart Shop — site settings
   Edit this file to change contact details, the promo band,
   banking details, and to connect your Google Sheet / forms.
   ========================================================== */
window.MDK = {
  business: {
    name: "MDK Smart Shop",
    founded: 2022,
    phone: "064 987 0578",
    phoneIntl: "+27649870578",
    whatsapp: "27649870578",               // country code + number, no + or spaces
    email: "tpy.media0@gmail.com",
    addressLines: ["8679 Tshepo Street", "Grinacker, Tokoza", "South Africa, 1426"],
    addressOneLine: "8679 Tshepo Street, Grinacker, Tokoza, South Africa, 1426"
  },

  /* 1. PRODUCTS — paste your published Google Sheet CSV link here.
        Leave empty to show the sample products in data/products.js.
        See README.md, step 1. */
  sheetCsvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS6r97j9iYyYzwPy6e2HS7W_e0IWBSlvQ-Sq2XGcv3ajRDl4e8CGEQ0FpYXVU6oiqXf2I3ygDPqWQJS/pub?gid=0&single=true&output=csv",

  /* 2. FORMS + AUTO-REPLIES — paste your Google Apps Script web app URL here.
        Leave empty and forms fall back to opening the visitor's email app.
        See README.md, step 2. */
  formEndpoint: "https://script.google.com/macros/s/AKfycbzEoRyAFNHWIE47F1EWhjS3E8hEmSJ1h-w2FtMmBwUq6KQjctDc9RKyogaOtRgpbRzkCA/exec",

  /* 3. BANKING DETAILS — printed on every quotation for EFT payments.
        Replace every [bracketed] value before the site goes live. */
  banking: {
    bank: "STANDARD BANK",
    accountName: "MDK SMART SHOP",
    accountNumber: "10108029083",
    accountType: "SAVINGS",
    branchCode: "51001"
  },

  /* 4. HOME PAGE PROMO BAND */
  promo: {
    title: "Order a hamper this month",
    text: "Choose a Breakfast, Lunch or Home Essentials hamper and have your quotation in minutes.",
    cta: "See the hampers",
    href: "catalogue.html?cat=Grocery%20Hampers"
  },

  currency: "R",
  quoteValidDays: 7
};
