import React, { useState, useEffect } from 'react';
import { Search, Download, Music2, CheckCircle, XCircle, Loader2, PlusCircle } from 'lucide-react';
import { supabase } from './supabaseClient';
import { genererLienPaiement } from './paytechService';

// TON CODE SECRET POUR NE PAS PAYER
const SECRET_ADMIN_CODE = "Chantre2026@";

function App() {
  const [search, setSearch] = useState("");
  const [resultats, setResultats] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  // ÉTATS POUR L'AJOUT
  const [isPaid, setIsPaid] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newTitre, setNewTitre] = useState("");
  const [newAuteur, setNewAuteur] = useState("");
  const [file, setFile] = useState(null);

  // VÉRIFICATION RETOUR DE PAIEMENT
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('status') === 'success') {
      setIsPaid(true);
      setShowAdmin(true);
      window.history.replaceState({}, document.title, "/");
    }
  }, []);

  // RECHERCHE DANS SUPABASE
  const chercherPartition = async (texte) => {
    setSearch(texte);
    if (texte.length < 2) { setResultats([]); return; }
    setChargement(true);
    const { data } = await supabase
      .from('bibliotheque_partitions')
      .select('*')
      .or(`titre.ilike.%${texte}%,auteur.ilike.%${texte}%`);
    setResultats(data || []);
    setChargement(false);
  };

  // LOGIQUE DE PAIEMENT (AVEC TON ACCÈS GRATUIT)
  const handleActionPaiement = async () => {
    if (!newTitre || !newAuteur) return alert("Remplis le titre et l'auteur !");

    // SI TU TAPE LE CODE SECRET DANS LE CHAMP AUTEUR
    if (newAuteur === SECRET_ADMIN_CODE) {
      alert("Accès Admin détecté. Publication gratuite activée !");
      setIsPaid(true);
      return;
    }

    // SINON PAIEMENT NORMAL POUR LES AUTRES
    setUploading(true);
    const urlWave = await genererLienPaiement(newTitre);
    if (urlWave) {
      window.location.href = urlWave;
    } else {
      alert("Erreur PayTech. Vérifie tes clés ou ton compte marchand.");
      setUploading(false);
    }
  };

  // UPLOAD FINAL SUR SUPABASE
  const finaliserPublication = async (e) => {
    e.preventDefault();
    if (!file) return alert("Sélectionne le fichier PDF !");
    setUploading(true);

    try {
      const fileName = `${Date.now()}-${newTitre.replace(/\s+/g, '_')}.pdf`;
      const { error: storageError } = await supabase.storage
        .from('partitions-files')
        .upload(fileName, file);

      if (storageError) throw storageError;

      const { data: publicUrlData } = supabase.storage.from('partitions-files').getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('bibliotheque_partitions')
        .insert([{ 
          titre: newTitre, 
          auteur: newAuteur === SECRET_ADMIN_CODE ? "Admin" : newAuteur,
          url_pdf: publicUrlData.publicUrl 
        }]);

      if (dbError) throw dbError;

      alert("✅ Partition publiée avec succès !");
      setIsPaid(false);
      setShowAdmin(false);
      setNewTitre("");
      setNewAuteur("");
    } catch (error) {
      alert("Erreur : " + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.logoBox} onClick={() => setShowAdmin(!showAdmin)}>
          <Music2 size={30} color="white" />
        </div>
        <h1 style={styles.title}>Chantre-App 🇸🇳</h1>
        <p style={styles.sub}>Trouvez et partagez vos partitions (500 FCFA / ajout)</p>
      </header>

      {showAdmin && (
        <div style={styles.adminPanel}>
          <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
            <h3 style={{margin:0}}>{isPaid ? "Envoyer le fichier" : "Ajouter une partition"}</h3>
            <XCircle onClick={() => setShowAdmin(false)} cursor="pointer" size={20} color="#666" />
          </div>

          {!isPaid ? (
            <div style={styles.stepBox}>
              <input type="text" placeholder="Titre du chant" style={styles.input} value={newTitre} onChange={e => setNewTitre(e.target.value)} />
              <input type="text" placeholder="Auteur (ou Code Secret)" style={styles.input} value={newAuteur} onChange={e => setNewAuteur(e.target.value)} />
              <button onClick={handleActionPaiement} disabled={uploading} style={styles.btnWave}>
                {uploading ? <Loader2 className="animate-spin" /> : "Payer 500 FCFA via Wave"}
              </button>
            </div>
          ) : (
            <form onSubmit={finaliserPublication} style={styles.form}>
              <div style={styles.badge}><CheckCircle size={16} /> Prêt pour l'envoi</div>
              <input type="file" accept=".pdf" onChange={e => setFile(e.target.files[0])} required style={{fontSize:'14px'}} />
              <button type="submit" disabled={uploading} style={styles.btnSubmit}>
                {uploading ? "Envoi en cours..." : "Publier maintenant"}
              </button>
            </form>
          )}
        </div>
      )}

      <div style={styles.searchBox}>
        <div style={styles.searchInner}>
          <Search size={20} color="#9ca3af" />
          <input type="text" placeholder="Rechercher un chant ou un auteur..." style={styles.searchInput} onChange={(e) => chercherPartition(e.target.value)} />
        </div>
      </div>

      <div style={styles.list}>
        {chargement && <p style={{textAlign:'center', fontSize:'14px'}}>Recherche...</p>}
        {resultats.map(p => (
          <div key={p.id} style={styles.card}>
            <div style={{flex: 1}}>
              <div style={{fontWeight:'600', color:'#111827'}}>{p.titre}</div>
              <div style={{fontSize:'12px', color:'#6b7280'}}>{p.auteur}</div>
            </div>
            <button style={styles.btnDownload} onClick={() => window.open(p.url_pdf, '_blank')}>
              <Download size={18} />
            </button>
          </div>
        ))}
        {search && resultats.length === 0 && !chargement && (
          <p style={{textAlign:'center', color:'#9ca3af', marginTop:'20px'}}>Aucun résultat trouvé.</p>
        )}
      </div>

      {!showAdmin && (
        <button style={styles.fab} onClick={() => setShowAdmin(true)}>
          <PlusCircle size={24} color="white" />
          <span>Ajouter</span>
        </button>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '20px', maxWidth: '480px', margin: '0 auto', fontFamily: '"Inter", sans-serif', backgroundColor: '#f3f4f6', minHeight: '100vh', position: 'relative' },
  header: { textAlign: 'center', margin: '30px 0' },
  logoBox: { backgroundColor: '#4f46e5', width: '60px', height: '60px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.4)' },
  title: { fontSize: '24px', fontWeight: '800', color: '#1f2937', margin: '15px 0 5px' },
  sub: { fontSize: '13px', color: '#6b7280' },
  adminPanel: { backgroundColor: '#fff', padding: '20px', borderRadius: '20px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', marginBottom: '25px', border: '1px solid #e5e7eb' },
  stepBox: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: { padding: '14px', borderRadius: '10px', border: '1px solid #d1d5db', outline: 'none', fontSize: '15px' },
  btnWave: { backgroundColor: '#1d4ed8', color: 'white', border: 'none', padding: '14px', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '15px' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  badge: { backgroundColor: '#d1fae5', color: '#065f46', padding: '12px', borderRadius: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', fontWeight: '600' },
  btnSubmit: { backgroundColor: '#059669', color: 'white', border: 'none', padding: '14px', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' },
  searchBox: { marginBottom: '25px' },
  searchInner: { display: 'flex', alignItems: 'center', backgroundColor: '#fff', padding: '0 15px', borderRadius: '15px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb' },
  searchInput: { width: '100%', padding: '15px 10px', border: 'none', outline: 'none', fontSize: '16px' },
  list: { display: 'flex', flexDirection: 'column', gap: '12px' },
  card: { backgroundColor: '#fff', padding: '16px', borderRadius: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  btnDownload: { backgroundColor: '#eef2ff', color: '#4f46e5', border: 'none', padding: '10px', borderRadius: '10px', cursor: 'pointer' },
  fab: { position: 'fixed', bottom: '20px', right: '20px', backgroundColor: '#4f46e5', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '30px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)', cursor: 'pointer' }
};

export default App;