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

  // VÉRIFICATION DU RETOUR PAIEMENT
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('status') === 'success') {
      setIsPaid(true);
      setShowAdmin(true);
      window.history.replaceState({}, document.title, "/");
    }
  }, []);

  // RECHERCHE DANS LA BASE DE DONNÉES
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

  // LOGIQUE DE PAIEMENT / ACCÈS ADMIN
  const handleActionPaiement = async () => {
    if (!newTitre || !newAuteur) return alert("Veuillez remplir le titre et l'auteur !");

    if (adminInput === SECRET_ADMIN_CODE) {
      alert("Accès Admin : Gratuité activée.");
      setIsPaid(true);
      return;
    }

    setUploading(true);
    const urlWave = await genererLienPaiement(newTitre);
    if (urlWave) {
      window.location.href = urlWave;
    } else {
      alert("Erreur PayTech. Vérifiez votre compte ou vos clés.");
      setUploading(false);
    }
  };

  // ENREGISTREMENT FINAL DANS SUPABASE
  const finaliserPublication = async (e) => {
    e.preventDefault();
    if (!file) return alert("Veuillez choisir un fichier PDF !");
    setUploading(true);

    try {
      const fileName = `${Date.now()}-${newTitre.replace(/\s+/g, '_')}.pdf`;
      const { error: storageError } = await supabase.storage
        .from('partitions-files')
        .upload(fileName, file);

      if (storageError) throw storageError;

      const { data: publicUrlData } = supabase.storage.from('partitions-files').getPublicUrl(fileName);

      // INSERTION DANS LA TABLE : Titre et Auteur sont bien sauvegardés ici
      const { error: dbError } = await supabase
        .from('bibliotheque_partitions')
        .insert([{ 
          titre: newTitre, 
          auteur: newAuteur, 
          url_pdf: publicUrlData.publicUrl 
        }]);

      if (dbError) throw dbError;

      alert("✅ Succès ! La partition est enregistrée en base de données.");
      setIsPaid(false);
      setShowAdmin(false);
      setNewTitre("");
      setNewAuteur("");
      setAdminInput("");
      setFile(null);
    } catch (error) {
      alert("Erreur technique : " + error.message);
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
        <p style={styles.sub}>Partagez et trouvez vos partitions en un clic</p>
      </header>

      {showAdmin && (
        <div style={styles.adminPanel}>
          <div style={styles.modalHeader}>
            <h3 style={{margin:0}}>{isPaid ? "Étape 2 : Fichier" : "Étape 1 : Infos"}</h3>
            <XCircle onClick={() => setShowAdmin(false)} cursor="pointer" size={22} color="#9ca3af" />
          </div>

          {!isPaid ? (
            <div style={styles.stepBox}>
              <label style={styles.label}>Titre de la partition</label>
              <input type="text" placeholder="Ex: Ave Maria" style={styles.input} value={newTitre} onChange={e => setNewTitre(e.target.value)} />
              
              <label style={styles.label}>Nom de l'auteur / Compositeur</label>
              <input type="text" placeholder="Ex: Schubert" style={styles.input} value={newAuteur} onChange={e => setNewAuteur(e.target.value)} />
              
              <div style={styles.divider}></div>
              
              <label style={styles.label}><Lock size={12} /> Code Admin (Gratuité)</label>
              <input type="password" placeholder="Réservé à l'administrateur" style={styles.inputAdmin} value={adminInput} onChange={e => setAdminInput(e.target.value)} />

              <button onClick={handleActionPaiement} disabled={uploading} style={styles.btnWave}>
                {uploading ? <Loader2 className="animate-spin" /> : "Suivant (500 FCFA)"}
              </button>
            </div>
          ) : (
            <form onSubmit={finaliserPublication} style={styles.form}>
              <div style={styles.badge}>
                <CheckCircle size={20} color="#059669" />
                <div style={{textAlign: 'left'}}>
                  <div style={{fontWeight: '700', fontSize: '14px'}}>Informations validées</div>
                  <div style={{fontSize: '12px', color: '#374151', marginTop: '2px'}}>
                    Chant : <b>{newTitre}</b> <br/>
                    Auteur : <b>{newAuteur}</b>
                  </div>
                </div>
              </div>
              
              <div style={styles.fileBox}>
                <label style={styles.label}>Choisir le PDF sur votre appareil</label>
                <input type="file" accept=".pdf" onChange={e => setFile(e.target.files[0])} required style={{marginTop: '10px', fontSize: '13px'}} />
              </div>
              
              <button type="submit" disabled={uploading} style={styles.btnSubmit}>
                {uploading ? <Loader2 className="animate-spin" /> : "Enregistrer définitivement"}
              </button>
              
              <button type="button" onClick={() => setIsPaid(false)} style={styles.btnBack}>
                Modifier le titre ou l'auteur
              </button>
            </form>
          )}
        </div>
      )}

      <div style={styles.searchBox}>
        <div style={styles.searchInner}>
          <Search size={20} color="#9ca3af" />
          <input type="text" placeholder="Rechercher un chant..." style={styles.searchInput} onChange={(e) => chercherPartition(e.target.value)} />
        </div>
      </div>

      <div style={styles.list}>
        {chargement && <p style={{textAlign: 'center'}}>Chargement...</p>}
        {resultats.map(p => (
          <div key={p.id} style={styles.card}>
            <div style={{flex: 1, display: 'flex', alignItems: 'center', gap: '12px'}}>
                <FileText size={24} color="#4f46e5" />
                <div>
                    <div style={{fontWeight:'600', color: '#111827'}}>{p.titre}</div>
                    <div style={{fontSize:'12px', color:'#6b7280'}}>{p.auteur}</div>
                </div>
            </div>
            <button style={styles.btnDownload} onClick={() => window.open(p.url_pdf, '_blank')}>
              <Download size={18} />
            </button>
          </div>
        ))}
      </div>

      {!showAdmin && (
        <button style={styles.fab} onClick={() => setShowAdmin(true)}>
          <PlusCircle size={24} color="white" />
          <span>Publier</span>
        </button>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '20px', maxWidth: '480px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh' },
  header: { textAlign: 'center', margin: '20px 0 30px' },
  logoBox: { backgroundColor: '#4f46e5', width: '60px', height: '60px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', cursor: 'pointer', boxShadow: '0 8px 16px rgba(79, 70, 229, 0.3)' },
  title: { fontSize: '24px', fontWeight: '850', color: '#111827', margin: '15px 0 5px', letterSpacing: '-0.5px' },
  sub: { fontSize: '13px', color: '#6b7280' },
  adminPanel: { backgroundColor: '#fff', padding: '24px', borderRadius: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', marginBottom: '25px', border: '1px solid #f3f4f6' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  stepBox: { display: 'flex', flexDirection: 'column', gap: '10px' },
  label: { fontSize: '12px', fontWeight: '700', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: { padding: '14px', borderRadius: '12px', border: '1px solid #e5e7eb', outline: 'none', fontSize: '15px', backgroundColor: '#f9fafb' },
  inputAdmin: { padding: '12px', borderRadius: '12px', border: '1px solid #f3f4f6', backgroundColor: '#fef2f2', fontSize: '14px' },
  divider: { height: '1px', backgroundColor: '#f3f4f6', margin: '10px 0' },
  btnWave: { backgroundColor: '#1d4ed8', color: 'white', border: 'none', padding: '16px', borderRadius: '14px', cursor: 'pointer', fontWeight: '700', marginTop: '10px', fontSize: '16px' },
  form: { display: 'flex', flexDirection: 'column', gap: '18px' },
  badge: { backgroundColor: '#ecfdf5', padding: '15px', borderRadius: '15px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #d1fae5' },
  fileBox: { padding: '15px', border: '2px dashed #e5e7eb', borderRadius: '15px', textAlign: 'center' },
  btnSubmit: { backgroundColor: '#059669', color: 'white', border: 'none', padding: '16px', borderRadius: '14px', fontWeight: '700', fontSize: '16px', display: 'flex', justifyContent: 'center' },
  btnBack: { background: 'none', border: 'none', color: '#6b7280', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' },
  searchBox: { marginBottom: '25px' },
  searchInner: { display: 'flex', alignItems: 'center', backgroundColor: '#fff', padding: '0 18px', borderRadius: '18px', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  searchInput: { width: '100%', padding: '16px 10px', border: 'none', outline: 'none', fontSize: '16px' },
  list: { display: 'flex', flexDirection: 'column', gap: '12px' },
  card: { backgroundColor: '#fff', padding: '18px', borderRadius: '20px', display: 'flex', alignItems: 'center', border: '1px solid #f3f4f6', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' },
  btnDownload: { backgroundColor: '#f5f7ff', color: '#4f46e5', border: 'none', padding: '10px', borderRadius: '12px', cursor: 'pointer' },
  fab: { position: 'fixed', bottom: '25px', right: '25px', backgroundColor: '#4f46e5', color: 'white', border: 'none', padding: '14px 24px', borderRadius: '35px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '700', boxShadow: '0 12px 20px rgba(79, 70, 229, 0.4)', cursor: 'pointer' }
};

export default App;