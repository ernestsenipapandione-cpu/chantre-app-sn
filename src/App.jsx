import React, { useState, useEffect } from 'react';
import { Search, Download, Music2, CheckCircle, XCircle, Loader2, PlusCircle, Lock, FileText } from 'lucide-react';
import { supabase } from './supabaseClient';
import { genererLienPaiement } from './paytechService';

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
  const [adminInput, setAdminInput] = useState(""); 
  const [file, setFile] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('status') === 'success') {
      setIsPaid(true);
      setShowAdmin(true);
      window.history.replaceState({}, document.title, "/");
    }
  }, []);

  // RECHERCHE DYNAMIQUE (CACHE LES RÉSULTATS SI VIDE)
  const chercherPartition = async (texte) => {
    setSearch(texte);
    if (texte.trim() === "") {
      setResultats([]); 
      return;
    }
    setChargement(true);
    const { data } = await supabase
      .from('bibliotheque_partitions')
      .select('*')
      .or(`titre.ilike.%${texte}%,auteur.ilike.%${texte}%`)
      .order('titre', { ascending: true })
      .limit(20);

    setResultats(data || []);
    setChargement(false);
  };

  // TÉLÉCHARGEMENT DIRECT
  const telechargerFichier = async (url, nomFichier) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', `${nomFichier.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      window.open(url, '_blank');
    }
  };

  // GESTION ADMIN / PAIEMENT
  const handleActionPaiement = async () => {
    if (!newTitre || !newAuteur) return alert("Remplissez le titre et l'auteur !");
    
    // Si c'est l'admin, on passe direct
    if (adminInput === SECRET_ADMIN_CODE) {
      setIsPaid(true);
      return;
    }

    setUploading(true);
    const urlWave = await genererLienPaiement(newTitre);
    if (urlWave) {
      window.location.href = urlWave;
    } else {
      alert("Erreur PayTech.");
      setUploading(false);
    }
  };

  const finaliserPublication = async (e) => {
    e.preventDefault();
    if (!file) return alert("Sélectionnez un PDF !");
    setUploading(true);
    try {
      const fileName = `${Date.now()}-${newTitre.replace(/\s+/g, '_')}.pdf`;
      const { error: storageError } = await supabase.storage.from('partitions-files').upload(fileName, file);
      if (storageError) throw storageError;
      const { data: publicUrlData } = supabase.storage.from('partitions-files').getPublicUrl(fileName);
      const { error: dbError } = await supabase.from('bibliotheque_partitions').insert([{ titre: newTitre, auteur: newAuteur, url_pdf: publicUrlData.publicUrl }]);
      if (dbError) throw dbError;
      alert("✅ Partition publiée !");
      setIsPaid(false); setShowAdmin(false); setNewTitre(""); setNewAuteur(""); setFile(null); setAdminInput("");
    } catch (error) { alert(error.message); } finally { setUploading(false); }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.logoBox} onClick={() => setShowAdmin(!showAdmin)}>
          <Music2 size={30} color="white" />
        </div>
        <h1 style={styles.title}>Chantre-App 🇸🇳</h1>
        <p style={styles.sub}>Recherchez une partition pour commencer</p>
      </header>

      {showAdmin && (
        <div style={styles.adminPanel}>
          <div style={styles.modalHeader}>
            <h3 style={{margin:0, fontSize:'16px'}}>{isPaid ? "Étape 2 : Envoyer le fichier" : "Étape 1 : Infos du chant"}</h3>
            <XCircle onClick={() => setShowAdmin(false)} cursor="pointer" size={22} color="#9ca3af" />
          </div>
          
          {!isPaid ? (
            <div style={styles.stepBox}>
              <input type="text" placeholder="Titre du chant" style={styles.input} value={newTitre} onChange={e => setNewTitre(e.target.value)} />
              <input type="text" placeholder="Auteur / Compositeur" style={styles.input} value={newAuteur} onChange={e => setNewAuteur(e.target.value)} />
              
              <div style={styles.divider}></div>
              <p style={{fontSize: '11px', color: '#6b7280', margin: '0 0 5px 5px'}}>Réservé aux administrateurs :</p>
              <input type="password" placeholder="Code secret" style={styles.inputAdmin} value={adminInput} onChange={e => setAdminInput(e.target.value)} />
              
              <button onClick={handleActionPaiement} disabled={uploading} style={styles.btnPay}>
                {uploading ? <Loader2 className="animate-spin" /> : "PAYER 500 FCFA POUR PUBLIER"}
              </button>
              <p style={{fontSize: '10px', textAlign: 'center', color: '#9ca3af'}}>Paiement sécurisé via Wave ou Orange Money</p>
            </div>
          ) : (
            <form onSubmit={finaliserPublication} style={styles.form}>
              <div style={styles.badge}>
                <CheckCircle size={18} color="#059669" />
                <span style={{fontSize:'13px', color: '#065f46'}}>Paiement validé !</span>
              </div>
              <label style={{fontSize: '12px', fontWeight: 'bold'}}>Choisir le PDF :</label>
              <input type="file" accept=".pdf" onChange={e => setFile(e.target.files[0])} required />
              <button type="submit" disabled={uploading} style={styles.btnSubmit}>
                {uploading ? "Envoi en cours..." : "TERMINER LA PUBLICATION"}
              </button>
            </form>
          )}
        </div>
      )}

      <div style={styles.searchBox}>
        <div style={styles.searchInner}>
          <Search size={20} color="#4f46e5" />
          <input 
            type="text" 
            placeholder="Taper le nom d'un chant ou d'un auteur..." 
            style={styles.searchInput} 
            value={search}
            onChange={(e) => chercherPartition(e.target.value)} 
          />
        </div>
      </div>

      <div style={styles.list}>
        {chargement && <div style={{textAlign:'center'}}><Loader2 className="animate-spin" color="#4f46e5" /></div>}
        
        {search.trim() !== "" && resultats.map(p => (
          <div key={p.id} style={styles.card}>
            <div style={{flex: 1}}>
                <div style={{fontWeight:'700', fontSize:'15px'}}>{p.titre}</div>
                <div style={{fontSize:'12px', color:'#6b7280'}}>{p.auteur}</div>
            </div>
            <button style={styles.btnDownload} onClick={() => telechargerFichier(p.url_pdf, p.titre)}>
              <Download size={18} />
            </button>
          </div>
        ))}

        {search.trim() !== "" && resultats.length === 0 && !chargement && (
          <p style={{textAlign:'center', color:'#9ca3af', fontSize:'14px'}}>Aucun résultat pour "{search}"</p>
        )}
        
        {search.trim() === "" && (
          <div style={styles.emptyState}>
            <FileText size={40} color="#e5e7eb" />
            <p>Le catalogue est masqué.<br/>Faites une recherche pour voir les chants.</p>
          </div>
        )}
      </div>

      {!showAdmin && (
        <button style={styles.fab} onClick={() => setShowAdmin(true)}>
          <PlusCircle size={22} color="white" />
          <span>PUBLIER (500F)</span>
        </button>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '15px', maxWidth: '480px', margin: '0 auto', fontFamily: 'sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh' },
  header: { textAlign: 'center', margin: '20px 0 30px' },
  logoBox: { backgroundColor: '#4f46e5', width: '55px', height: '55px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', cursor: 'pointer', boxShadow: '0 4px 12px rgba(79,70,229,0.3)' },
  title: { fontSize: '24px', fontWeight: '850', margin: '15px 0 5px', color: '#111827' },
  sub: { fontSize: '13px', color: '#6b7280' },
  adminPanel: { backgroundColor: '#fff', padding: '20px', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', marginBottom: '20px', border: '1px solid #e5e7eb' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '15px' },
  stepBox: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: { padding: '14px', borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '16px', outline: 'none' },
  inputAdmin: { padding: '10px', borderRadius: '10px', border: '1px solid #f3f4f6', fontSize: '13px', backgroundColor: '#f9fafb' },
  divider: { height: '1px', backgroundColor: '#eee', margin: '10px 0' },
  btnPay: { backgroundColor: '#1d4ed8', color: 'white', border: 'none', padding: '16px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', fontSize: '14px', letterSpacing: '0.5px' },
  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  badge: { backgroundColor: '#f0fdf4', padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #bbf7d0' },
  btnSubmit: { backgroundColor: '#059669', color: 'white', border: 'none', padding: '16px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer' },
  searchBox: { marginBottom: '25px' },
  searchInner: { display: 'flex', alignItems: 'center', backgroundColor: '#fff', padding: '5px 15px', borderRadius: '18px', border: '2px solid #4f46e5' },
  searchInput: { width: '100%', padding: '15px 10px', border: 'none', outline: 'none', fontSize: '16px', fontWeight: '500' },
  list: { display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '100px' },
  card: { backgroundColor: '#fff', padding: '18px', borderRadius: '18px', display: 'flex', alignItems: 'center', border: '1px solid #f3f4f6', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  btnDownload: { backgroundColor: '#f5f3ff', color: '#4f46e5', border: 'none', padding: '12px', borderRadius: '12px', cursor: 'pointer' },
  emptyState: { textAlign: 'center', marginTop: '50px', color: '#9ca3af', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' },
  fab: { position: 'fixed', bottom: '25px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#111827', color: 'white', border: 'none', padding: '15px 25px', borderRadius: '35px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '800', boxShadow: '0 10px 20px rgba(0,0,0,0.3)', zIndex: 100, fontSize: '14px' }
};

export default App;