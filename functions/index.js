const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.createOrganisationUser = functions.https.onRequest(async (req, res) => {

  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  try {
    const { name, email, password } = req.body;

    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name
    });

    await admin.firestore().collection("users").doc(userRecord.uid).set({
      name,
      email,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.status(200).send({ success: true });

  } catch (error) {
    console.error(error);
    return res.status(500).send(error.message);
  }
});