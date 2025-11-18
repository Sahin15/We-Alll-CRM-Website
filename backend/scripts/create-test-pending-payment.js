import mongoose from "mongoose";
import dotenv from "dotenv";
import Payment from "../src/models/paymentModel.js";
import Client from "../src/models/clientModel.js";
import Subscription from "../src/models/subscriptionModel.js";
import User from "../src/models/userModel.js";

dotenv.config();

const createTestPendingPayment = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Find a client
    const client = await Client.findOne();
    if (!client) {
      console.log("❌ No clients found. Please create a client first.");
      process.exit(1);
    }
    console.log(`✅ Found client: ${client.name}`);

    // Find a subscription
    const subscription = await Subscription.findOne({ client: client._id });
    if (!subscription) {
      console.log("❌ No subscriptions found for this client. Please create a subscription first.");
      process.exit(1);
    }
    console.log(`✅ Found subscription: ${subscription.subscriptionNumber}`);

    // Find an admin user
    const admin = await User.findOne({ role: "admin" });
    if (!admin) {
      console.log("❌ No admin user found.");
      process.exit(1);
    }

    // Create pending payment with future due date
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7); // 7 days from now

    const payment = await Payment.create({
      client: client._id,
      subscription: subscription._id,
      amount: 5000,
      paidAmount: 0,
      balanceAmount: 5000,
      paymentMethod: "upi",
      upiDetails: {
        upiId: "testuser@paytm",
        transactionId: "TXN" + Date.now(),
      },
      paymentProof: "https://via.placeholder.com/600x400?text=Payment+Proof+Screenshot",
      status: "pending",
      paymentDate: new Date(),
      dueDate: futureDate,
      notes: "Test payment submission. Please verify this payment.",
      createdBy: admin._id,
    });

    console.log("\n✅ Test pending payment created successfully!");
    console.log("Payment ID:", payment._id);
    console.log("Client:", client.name);
    console.log("Subscription:", subscription.subscriptionNumber);
    console.log("Amount:", payment.amount);
    console.log("Status:", payment.status);
    console.log("\n📋 You can now view this payment in the Payment Verification page!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating test payment:", error.message);
    process.exit(1);
  }
};

createTestPendingPayment();
