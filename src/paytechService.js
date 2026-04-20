// src/paytechService.js

export const genererLienPaiement = async (titrePartition) => {
  // TES CLÉS API
  const apiKey = "492ab560328ab34042fa12bfd09921380c81079f1da0bede639bbc3abaff2b6a";
  const apiSecret = "54d938670d09c26844169e4e32b63c875c01aeccf3cba5889939aa8ac7da3c88";

  try {
    const response = await fetch("https://paytech.sn/api/payment/request-payment", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "API_KEY": apiKey,
        "API_SECRET": apiSecret,
      },
      body: JSON.stringify({
        item_name: `Publication : ${titrePartition}`,
        item_price: "500",
        currency: "XOF",
        ref_command: `ref-${Date.now()}`,
        command_name: "Paiement Publication Chantre-App",
        env: "live", // On passe en live car tu es sur un vrai domaine Vercel
        success_url: window.location.origin + "?status=success",
        cancel_url: window.location.origin,
      }),
    });

    const result = await response.json();

    if (result.success === 1) {
      return result.redirect_url;
    } else {
      console.error("Détails Erreur PayTech:", result.errors);
      return null;
    }
  } catch (error) {
    console.error("Erreur Connexion PayTech:", error);
    return null;
  }
};