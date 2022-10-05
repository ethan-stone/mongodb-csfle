import * as dotenv from "dotenv";
import { MongoClient } from "mongodb";
import { ClientEncryption } from "mongodb-client-encryption";

dotenv.config();

const mongoUrl = process.env.DATABASE_URL;

if (!mongoUrl) throw new Error("Missing mongo url");

const mongoClient = new MongoClient(mongoUrl);

async function main() {
  const keyVaultDatabase = "encryption";
  const keyVaultCollection = "__keyVault";
  const keyVaultNamespace = `${keyVaultDatabase}.${keyVaultCollection}`;

  const keyVaultDB = mongoClient.db(keyVaultDatabase);

  // Drop the Key Vault Collection in case you created this collection
  // in a previous run of this application.
  await keyVaultDB.dropDatabase();
  // Drop the database storing your encrypted fields as all
  // the DEKs encrypting those fields were deleted in the preceding line.
  await mongoClient.db("medicalRecords").dropDatabase();
  const keyVaultColl = keyVaultDB.collection(keyVaultCollection);
  await keyVaultColl.createIndex(
    { keyAltNames: 1 },
    {
      unique: true,
      partialFilterExpression: { keyAltNames: { $exists: true } }
    }
  );

  const provider = "gcp";

  const masterKey = {
    projectId: "phractal-dev-364103",
    location: "global",
    keyRing: "phractal",
    keyName: "mongodb-cmk"
  };

  const encryption = new ClientEncryption(mongoClient, {
    keyVaultNamespace,
    kmsProviders: {
      gcp: {
        email: "mongodb@phractal-dev-364103.iam.gserviceaccount.com",
        privateKey: process.env.PRIVATE_KEY as string
      }
    }
  });
  const key = await encryption.createDataKey(provider, {
    masterKey: masterKey
  });

  console.log("DataKeyId [base64]: ", key.toString("base64"));

  await mongoClient.close();
}

main();
