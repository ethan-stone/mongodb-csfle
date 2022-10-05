import * as dotenv from "dotenv";
import { Binary, MongoClient } from "mongodb";

dotenv.config();

const mongoUrl = process.env.DATABASE_URL;

if (!mongoUrl) throw new Error("Missing mongo url");

const keyVaultNamespace = "encryption.__keyVault";

const kmsProviders = {
  gcp: {
    email: "mongodb@phractal-dev-364103.iam.gserviceaccount.com",
    privateKey: process.env.PRIVATE_KEY as string
  }
};

const dataKey = "vQnkzN5qRsuv3Uqn/ZNB8w==";
const schema = {
  bsonType: "object",
  encryptMetadata: {
    keyId: [new Binary(Buffer.from(dataKey, "base64"), 4)]
  },
  properties: {
    insurance: {
      bsonType: "object",
      properties: {
        policyNumber: {
          encrypt: {
            bsonType: "int",
            algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic"
          }
        }
      }
    },
    medicalRecords: {
      encrypt: {
        bsonType: "array",
        algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Random"
      }
    },
    bloodType: {
      encrypt: {
        bsonType: "string",
        algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Random"
      }
    },
    ssn: {
      encrypt: {
        bsonType: "int",
        algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic"
      }
    }
  }
};

const patientSchema: Record<string, any> = {};
patientSchema[keyVaultNamespace] = schema;

const secureClient = new MongoClient(mongoUrl, {
  autoEncryption: {
    keyVaultNamespace,
    kmsProviders,
    schemaMap: patientSchema
  }
});

async function main() {
  try {
    const writeResult = await secureClient
      .db("medicalRecords")
      .collection("patients")
      .insertOne({
        name: "Jon Doe",
        ssn: 241014209,
        bloodType: "AB+",
        medicalRecords: [{ weight: 180, bloodPressure: "120/80" }],
        insurance: {
          policyNumber: 123142,
          provider: "MaestCare"
        }
      });

    console.log(writeResult);
  } catch (writeError) {
    console.error("writeError occurred:", writeError);
  }
}

main();
