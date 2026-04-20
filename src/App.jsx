import React, { useState, useEffect } from 'react';
import { Search, Download, Music2, BookOpen, Smartphone, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from './supabaseClient';
import { genererLienPaiement } from './paytechService';

function App() {
  const [search, setSearch] = useState("");
  const [resultats, setResultats] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  // ÉTATS AJOUT
  const [isPaid, setIsPaid] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newTitre, setNewTitre] = useState("");
  const [newAuteur, setNewAuteur] = useState("");
  const [file, setFile] = useState(null);

  // --- VÉRIFICATION DU RETOUR PAIEMENT ---
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('status') === 'success') {
      setIsPaid(true);
      setShowAdmin(true); // Ouvre direct le formulaire si succès
      // On nettoie l'URL pour éviter de re-valider au refresh
      window.history.replaceState({}, document.title, "/");
    }
  }, []);

  // --- RECHERCHE ---
  const chercherPartition = async (texte) => {
    setSearch(texte);
    if (texte.length === 0) { setResultats([]); return; }
    setChargement(true);
    const { data } = await supabase
      .from('bibliotheque_partitions')
      .select('*')
      .or(`titre.ilike.%${texte}%,auteur.ilike.%${texte}%`);
    setResultats(data || []);
    setChargement(false);
  };

  // --- ACTION PAIEMENT ---
  const handlePayer = async () => {
    if (!newTitre || !newAuteur) return alert("Remplissez le titre et l'auteur d'abord !");
    setUploading(true);
    const urlWave = await genererLienPaiement(newTitre);
    if (urlWave) {
      window.location.href = urlWave; // Redirection vers Wave
    } else {
      alert("Erreur PayTech. Vérifiez vos clés ou votre connexion.");
      setUploading(false);
    }
  };

  // --- ENVOI FINAL ---
  const finaliserEnvoi = async (e) => {
    e.preventDefault();
    if (!file) return alert("Sélectionnez le PDF !");
    setUploading(true);

    const fileName = `${newTitre}.pdf`;
    const { error: storageError } = await supabase.storage.from('partitions-files').upload(fileName, file);

    if (!storageError) {
      await supabase.from('bibliotheque_partitions').insert([{ titre: newTitre, auteur: newAuteur }]);
      alert("✅ Félicitations ! Votre partition est en ligne.");
      setIsPaid(false);
      setShowAdmin(false);
    } else {
      alert("Erreur upload: " + storageError.message);
    }
    setUploading(false);
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.logoBox} onDoubleClick={() => setShowAdmin(!showAdmin)}>
          <Music2 size={28} color="white" />
        </div>
        <h1 style={styles.title}>Chantre-App 🇸🇳</h1>
        <p style={styles.sub}>Partagez vos chants (500 FCFA par ajout via Wave)</p>
      </header>

      {showAdmin && (
        <div style={styles.adminPanel}>
          <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
            <h3 style={{margin:0}}>{isPaid ? "Détails du fichier" : "Étape 1 : Paiement"}</h3>
            <XCircle onClick={() => setShowAdmin(false)} cursor="pointer" size={20} />
          </div>

          {!isPaid ? (
            <div style={styles.stepBox}>
              <input type="text" placeholder="Titre du chant" style={styles.input} onChange={e => setNewTitre(e.target.value)} />
              <input type="text" placeholder="Auteur" style={styles.input} onChange={e => setNewAuteur(e.target.value)} />
              <button onClick={handlePayer} disabled={uploading} style={styles.btnWave}>
                {uploading ? <Loader2 className="animate-spin" /> : "Payer 500 FCFA par Wave"}
              </button>
            </div>
          ) : (
            <form onSubmit={finaliserEnvoi} style={styles.form}>
              <div style={styles.badge}><CheckCircle size={16} /> Paiement Wave Confirmé</div>
              <p style={{fontSize:'12px'}}>Titre : <b>{newTitre}</b></p>
              <input type="file" accept=".pdf" onChange={e => setFile(e.target.files[0])} required />
              <button type="submit" disabled={uploading} style={styles.btnSubmit}>
                {uploading ? "Publication..." : "Mettre en ligne"}
              </button>
            </form>
          )}
        </div>
      )}

      {/* RECHERCHE */}
      <div style={styles.searchBox}>
        <input type="text" placeholder="Rechercher une partition..." style={styles.searchInput} onChange={(e) => chercherPartition(e.target.value)} />
      </div>

      {/* RÉSULTATS */}
      <div style={styles.list}>
        {resultats.map(p => (
          <div key={p.id} style={styles.card}>
            <div>
              <div style={{fontWeight:'bold'}}>{p.titre}</div>
              <div style={{fontSize:'12px', color:'#666'}}>{p.auteur}</div>
            </div>
            <Download size={20} color="#4f46e5" cursor="pointer" onClick={() => window.open(supabase.storage.from('partitions-files').getPublicUrl(`${p.titre}.pdf`).data.publicUrl, '_blank')} />
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '20px', maxWidth: '450px', margin: '0 auto', fontFamily: 'sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh' },
  header: { textAlign: 'center', marginBottom: '20px' },
  logoBox: { backgroundColor: '#4f46e5', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', cursor: 'pointer' },
  title: { fontSize: '22px', fontWeight: 'bold', margin: '10px 0 0' },
  sub: { fontSize: '12px', color: '#6b7280' },
  adminPanel: { backgroundColor: '#fff', padding: '20px', borderRadius: '15px', border: '2px solid #4f46e5', marginBottom: '20px' },
  stepBox: { display: 'flex', flexDirection: 'column', gap: '10px' },
  input: { padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none' },
  btnWave: { backgroundColor: '#1d4ed8', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  form: { display: 'flex', flexDirection: 'column', gap: '10px' },
  badge: { backgroundColor: '#d1fae5', color: '#065f46', padding: '10px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' },
  btnSubmit: { backgroundColor: '#059669', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  searchBox: { marginBottom: '20px' },
  searchInput: { width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', boxSizing: 'border-box' },
  list: { display: 'flex', flexDirection: 'column', gap: '10px' },
  card: { backgroundColor: '#fff', padding: '15px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #f3f4f6' }
};

export default App;