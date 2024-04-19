// package of all
const { v4: uuidv4 } = require("uuid");
const SSLCommerzPayment = require("sslcommerz-lts");
const axios = require("axios");
const globals = require("node-global-storage");
// package of all
// testing number 


// Checkout Demo
// Go to https://merchantdemo.sandbox.bka.sh/frontend/checkout/version/1.2.0-beta
// text number : 01619777282
// Wallet Number: 01770618575
// balance nai : 01823074817
// OTP: 123456
// Pin: 12121

// testing number 

// bkish credential ...................................

// # Bkash payment request 
// bkash_username = 'sandboxTokenizedUser02'
// bkash_password = 'sandboxTokenizedUser02@12345'
// bkash_api_key = '4f6o0cjiki2rfm34kfdadl1eqq'
// bkash_secret_key = '2is7hdktrekvrbljjh44ll3d9l1dtjo4pasmjvs5vl5qr3fug4b'
// callbackURL='http://localhost:5000'
// bkash_grant_token_url = https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout/token/grant
// bkash_create_payment_url =  https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout/create
// bkash_execute_payment_url = https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout/execute
// bkash_refund_transaction_url = https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout/payment/refund

// bkish credential ...................................
// middleware  bkash
const bkashAuth = async (req, res, next) => {
  globals.unset("id_token");
  try {
    const { data } = await axios.post(
      process?.env?.bkash_grant_token_url,
      {
        app_key: process?.env?.bkash_api_key,
        app_secret: process?.env.bkash_secret_key,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          username: process?.env?.bkash_username,
          password: process?.env?.bkash_password,
        },
      }
    );

    globals.set("id_token", data?.id_token, { protected: true });

    next();
  } catch (error) {
    return res.status(401).send({ error: error?.message });
  }
};
// --------------------------------------------------------------------------
// --------------------------------SSl Payment Gateway--------------------------------
// --------------------------------------------------------------------------

const tranId = new ObjectId().toString();
app.post("/payment/ssl", async (req, res) => {
  const { info } = req?.body;
  const product = await paymentType.findOne({ _id: new ObjectId(info?.id) });
  const data = {
    total_amount: product?.price,
    currency: "BDT",
    tran_id: tranId, // use unique tran_id for each api call
    success_url: `http://localhost:5000/payment/success/${tranId}`,
    fail_url: `http://localhost:5000/payment/fail/${tranId}`,
    cancel_url: "http://localhost:5000/payment/cancel",
    ipn_url: "http://localhost:3030/ipn",
    shipping_method: "Courier",
    product_name: product?.name,
    product_category: "web",
    product_profile: "general",
    cus_name: info?.userName,
    cus_email: info?.userEmail,
    cus_add1: "Dhaka",
    cus_add2: "Dhaka",
    cus_city: "Dhaka",
    cus_state: "Dhaka",
    cus_postcode: "1000",
    cus_country: "Bangladesh",
    cus_phone: "01711111111",
    cus_fax: "01711111111",
    ship_name: "Customer Name",
    ship_add1: "Dhaka",
    ship_add2: "Dhaka",
    ship_city: "Dhaka",
    ship_state: "Dhaka",
    ship_postcode: 1000,
    ship_country: "Bangladesh",
  };

  const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
  sslcz.init(data).then((apiResponse) => {
    // Redirect the user to payment gateway
    let GatewayPageURL = apiResponse.GatewayPageURL;
    res.send({ url: GatewayPageURL });
  });

  const finalOrder = {
    name: info?.userName,
    email: info?.userEmail,
    package: product?.name,
    paymentType: "sslcommerz",
    Price: product?.price,
    paidStatus: false,
    transactionID: tranId,
  };
  const result = await perchesPlanUsers.insertOne(finalOrder);

  app.post("/payment/success/:tranId", async (req, res) => {
    const id = req?.params?.tranId;
    const result = await perchesPlanUsers.updateOne(
      { transactionID: id },
      {
        $set: {
          paidStatus: true,
        },
      }
    );

    if (result?.modifiedCount > 0) {
      res.redirect(`http://localhost:5173/payment/success/${id}`);
    }
  });
  app.post("/payment/fail/:tranId", async (req, res) => {
    const id = req?.params?.tranId;
    const result = await perchesPlanUsers.deleteOne({ transactionID: id });
    if (result?.deletedCount > 0) {
      res.redirect(`http://localhost:5173/payment/fail/${id}`);
    }
  });
});
// --------------------------------------------------------------------------
// --------------------------------SSL Payment Gateway--------------------------------
// --------------------------------------------------------------------------

// --------------------------------------------------------------------------
// --------------------------------Bkash Payment Gateway--------------------------------
// --------------------------------------------------------------------------

const bkash_headers = async () => {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    authorization: globals.get("id_token"),
    "x-app-key": process.env.bkash_api_key,
  };
};
app.post("/bkash-checkout", bkashAuth, async (req, res) => {
  const { details } = req?.body;
  globals.set("productId", details?.id);
  globals.set("userName", details?.userName);
  globals.set("userEmail", details?.userEmail);
  const product = await paymentType.findOne({ _id: new ObjectId(details?.id) });
  try {
    const { data } = await axios.post(
      process.env.bkash_create_payment_url,
      {
        mode: "0011",
        payerReference: " ",
        callbackURL: `${process.env.callbackURL}/bkash/payment/callback`,
        amount: product?.price,
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber: "Inv" + uuidv4().substring(0, 9),
      },
      {
        headers: await bkash_headers(),
      }
    );
    return res.status(200).send({ bkashURL: data?.bkashURL });
  } catch (error) {
    return res.status(401).send({ error: error?.message });
  }
});

app.get("/bkash/payment/callback", bkashAuth, async (req, res) => {
  const { paymentID, status } = req.query;

  if (status === "cancel" || status === "failure") {
    return res.redirect(`http://localhost:5173/error?message=${status}`);
  }
  if (status === "success") {
    try {
      const { data } = await axios.post(
        process?.env?.bkash_execute_payment_url,
        { paymentID },
        {
          headers: await bkash_headers(),
        }
      );
      const product = await paymentType.findOne({
        _id: new ObjectId(globals.get("productId")),
      });

      if (data && data?.statusCode === "0000") {
        const finalOrder = {
          name: globals.get("userName"),
          email: globals.get("userEmail"),
          paymentType: "Bkash",
          package: product?.name,
          Price: parseInt(data?.amount) || product?.price,
          customerMsisdn: data?.customerMsisdn,
          transactionStatus: data?.transactionStatus,
          paidStatus: true,
          trxID: data?.trxID,
          paymentID: data?.paymentID,
          merchantInvoiceNumber: data?.merchantInvoiceNumber,
          date: data?.paymentExecuteTime,
        };
        await perchesPlanUsers.insertOne(finalOrder);

        return res.redirect(`http://localhost:5173/payment/success/${"hi"}`);
      } else {
        return res.redirect(
          `http://localhost:5173/error?message=${data?.statusMessage}`
        );
      }
    } catch (error) {
      console.log(error);
      return res.redirect(
        `http://localhost:5173/error?message=${error?.message}`
      );
    }
  }
});

// Add this route under admin middleware
app.post("/bkash-refund", bkashAuth, async (req, res) => {
  const { trxID } = req.params;
  try {
    const payment = await perchesPlanUsers.findOne({ trxID });

    const { data } = await axios.post(
      process.env.bkash_refund_transaction_url,
      {
        paymentID: payment?.paymentID,
        amount: payment?.amount,
        trxID,
        sku: "payment",
        reason: "cashback",
      },
      {
        headers: await bkash_headers(),
      }
    );
    if (data && data.statusCode === "0000") {
      return res.status(200).json({ message: "refund success" });
    } else {
      return res.status(404).json({ error: "refund failed" });
    }
  } catch (error) {
    return res.status(404).json({ error: "refund failed" });
  }
});

app.get("/bkash-search", async (req, res) => {
  try {
    const { trxID } = req.query;
    const result = await searchTransaction(bkashConfig, trxID);
    res.send(result);
  } catch (e) {
    console.log(e);
  }
});

app.get("/bkash-query", async (req, res) => {
  try {
    const { paymentID } = req.query;
    const result = await queryPayment(bkashConfig, paymentID);
    res.send(result);
  } catch (e) {
    console.log(e);
  }
});

// --------------------------------------------------------------------------
// --------------------------------Bkash Payment Gateway End Here--------------------------------
// ------------------------------------------------------------------------------------
