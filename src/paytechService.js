export const genererLienPaiement = async (titrePartition) => {
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
        item_name: `Publication: ${titrePartition}`,
        item_price: "500",
        currency: "XOF",
        ref_command: `ref-${Date.now()}`,
        command_name: "Publication Chantre-App",
        env: "test", 
        success_url: window.location.origin + "?status=success",
        cancel_url: window.location.origin,
      }),
    });

    const result = await response.json();
    if (result.success === 1) return result.redirect_url;
    
    alert("Erreur PayTech: " + (result.errors ? result.errors[0] : "Clés ou config invalide"));
    return null;
  } catch (error) {
    alert("Le navigateur bloque la connexion (CORS). Mettez le site en ligne pour tester.");
    return null;
  }
};