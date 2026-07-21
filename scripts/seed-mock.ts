import { db } from "../src/config/firebase";

async function seedMockData() {
  console.log("Seeding mock products for Tola Shofola...");
  const mockUid = "mock_uid_tola";

  const products = [
    { name: "Vintage Denim Jacket", price: 25000, variants: ["Blue", "Black", "Washed"], id: "p1" },
    { name: "Graphic Oversized Tee", price: 8500, variants: ["S", "M", "L", "XL"], id: "p2" },
    { name: "Cargo Pants", price: 15000, variants: ["Olive", "Black", "Khaki"], id: "p3" },
    { name: "Chunky Sneakers", price: 35000, variants: ["White", "Black", "Beige"], id: "p4" },
    { name: "Knitted Beanie", price: 4000, variants: ["Red", "Black", "Grey"], id: "p5" },
    { name: "Retro Sunglasses", price: 6000, variants: ["Tortoise", "Black", "Clear"], id: "p6" },
    { name: "Leather Tote Bag", price: 22000, variants: ["Brown", "Black"], id: "p7" },
    { name: "Corduroy Overshirt", price: 18000, variants: ["Mustard", "Navy", "Forest Green"], id: "p8" },
    { name: "High-Top Canvas Shoes", price: 28000, variants: ["White", "Black", "Red"], id: "p9" },
    { name: "Silver Chain Necklace", price: 12000, variants: ["18 inch", "20 inch", "24 inch"], id: "p10" },
    { name: "Athleisure Joggers", price: 11500, variants: ["Black", "Grey", "Navy"], id: "p11" },
    { name: "Bucket Hat", price: 5500, variants: ["Canvas", "Denim", "Nylon"], id: "p12" },
    { name: "Puffer Vest", price: 21000, variants: ["Black", "Olive", "Orange"], id: "p13" },
    { name: "Classic Chelsea Boots", price: 45000, variants: ["Suede Brown", "Leather Black"], id: "p14" },
    { name: "Essential Zip-Up Hoodie", price: 14000, variants: ["Grey", "Black", "Navy"], id: "p15" }
  ];

  for (const p of products) {
    await db.collection("merchants").doc(mockUid).collection("products").doc(p.id).set({
      id: p.id,
      name: p.name,
      price: p.price,
      variants: p.variants,
      createdAt: Date.now()
    });
  }

  // Set mock merchant settings
  await db.collection("merchants").doc(mockUid).collection("config").doc("settings").set({
    notAvailableMessage: "I'm sorry, but we don't have that item in stock right now. Would you like to see our similar items?"
  }, { merge: true });

  console.log("Mock data seeded successfully.");
}

seedMockData().then(() => process.exit(0)).catch(e => {
  console.error("Seed error:", e);
  process.exit(1);
});
