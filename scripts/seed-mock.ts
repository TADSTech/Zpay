import { db } from "../src/config/firebase";
import { MONNIFY_API_KEY, MONNIFY_SECRET_KEY, MONNIFY_CONTRACT_CODE } from "../src/config/env";

async function seedMockData() {
  console.log("Seeding mock products & Monnify config for Tola Shofola (Presentation Account)...");
  const mockUid = "mock_uid_tola";

  const products = [
    { name: "White Sneakers", price: 35000, variants: ["White"], stockQuantity: 20, id: "p1" },
    { name: "Black Hoodie", price: 18000, variants: ["Black", "Grey"], stockQuantity: 20, id: "p2" },
    { name: "Large Pizza", price: 12000, variants: ["Pepperoni", "BBQ Chicken", "Margherita"], stockQuantity: 50, id: "p3" },
    { name: "Coke", price: 1000, variants: ["Can 33cl"], stockQuantity: 100, id: "p4" },
    { name: "Diapers (Size 5)", price: 8500, variants: ["Pack of 30"], stockQuantity: 30, id: "p5" },
    { name: "Vintage Denim Jacket", price: 25000, variants: ["Blue", "Black"], stockQuantity: 15, id: "p6" },
    { name: "Graphic Oversized Tee", price: 8500, variants: ["S", "M", "L", "XL"], stockQuantity: 25, id: "p7" },
    { name: "Cargo Pants", price: 15000, variants: ["Olive", "Black"], stockQuantity: 20, id: "p8" },
    { name: "Leather Tote Bag", price: 22000, variants: ["Brown", "Black"], stockQuantity: 10, id: "p9" },
    { name: "Retro Sunglasses", price: 6000, variants: ["Black", "Tortoise"], stockQuantity: 15, id: "p10" },
  ];

  for (const p of products) {
    await db.collection("merchants").doc(mockUid).collection("products").doc(p.id).set({
      id: p.id,
      name: p.name,
      price: p.price,
      variants: p.variants,
      stockQuantity: p.stockQuantity,
      createdAt: Date.now()
    });
  }

  // Set mock merchant settings & config
  await db.collection("merchants").doc(mockUid).collection("config").doc("settings").set({
    notAvailableMessage: "I'm sorry, but we don't have that item in stock right now. Would you like to see our similar items?"
  }, { merge: true });

  await db.collection("merchants").doc(mockUid).collection("config").doc("monnify").set({
    apiKey: MONNIFY_API_KEY || "MK_TEST_E2C39BK9ZA",
    secretKey: MONNIFY_SECRET_KEY || "VJC325MKQN4VF0LYBBBASRFHFBTQWPYC",
    contractCode: MONNIFY_CONTRACT_CODE || "8025851174",
    updatedAt: Date.now()
  }, { merge: true });

  console.log("Mock data seeded successfully for Tola Shofola.");
}

seedMockData().then(() => process.exit(0)).catch(e => {
  console.error("Seed error:", e);
  process.exit(1);
});
