const PROXY_BASE_URL = "https://proxy-brapi.dionatan-sgs.workers.dev"; // <-- ajuste aqui
const SESSION_STORAGE_KEY = "meus_investimentos_session";
const USER_ID_STORAGE_KEY = "meus_investimentos_user_id";





function setStatus(msg, type=""){
  const el = document.getElementById("status");
  if(!el) return;
  el.textContent = msg || "";
  el.className = "status " + (type||"");
}

async function deriveKey(password, saltHex){
  const enc = new TextEncoder();
  const passKey = await crypto.subtle.importKey("raw", enc.encode(password), {name:"PBKDF2"}, false, ["deriveKey"]);
  const salt = hexToUint8(saltHex);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", hash:"SHA-256", salt, iterations: 200000 },
    passKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt","decrypt"]
  );
  return key;
}

 /* ====== crypto helpers (PBKDF2 -> AES-GCM) ====== */
function hexToUint8(hex){
  if(!hex) return new Uint8Array();
  const u8 = new Uint8Array(hex.length/2);
  for(let i=0;i<u8.length;i++) u8[i]=parseInt(hex.substr(i*2,2),16);
  return u8;
}

 /* ====== Login modal handlers ====== */
 async function fazerLoginModal() {
  
    const userIdEl = document.getElementById("modalLoginUserId");
    const passEl = document.getElementById("modalLoginPassword");
  
    const userId = userIdEl ? userIdEl.value.trim() : "";
    const password = passEl ? passEl.value : "";
  
    if (!userId || !password) {
      alert("Informe usuário e senha.");
      return;
    }
  
    setStatus("Autenticando...", "");
  
    try {
      const resp = await fetch(`${PROXY_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, password }),
      });
  
      const text = await resp.text();
      let json;
      try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  
      console.log("LOGIN RESPONSE:", resp.status, json || text);
  
      if (!resp.ok) {
        const message = (json && json.error) ? json.error : text;
        toast("Erro: " + message, 4000);
        setStatus("Falha ao autenticar: " + message, "error");
        return;
      }
  
      if (!json || !json.ok || !json.sessionId) {
        toast("Resposta inválida do servidor.", 4000);
        setStatus("Resposta inválida.", "error");
        return;
      }
      
      // Sucesso!
      sessionToken = json.sessionId;
      currentUserId = json.user.id;
  
      localStorage.setItem(SESSION_STORAGE_KEY, sessionToken);
      localStorage.setItem(USER_ID_STORAGE_KEY, currentUserId);
  
      try {
        cryptoKey = await deriveKey(password, json.encryptionSalt);
      } catch (e) {
        toast("Erro ao derivar chave.", 4000);
        console.error(e);
        return;
      }
  
      passEl.value = "";
      console.log(currentUserId)
      document.getElementById("currentUserLabel").textContent = currentUserId;
  
      // 🎉 FECHA O MODAL AQUI (garantido)
      //hideModal();
      
      toast("Login realizado com sucesso!", 2500);
      setStatus(`Logado como ${currentUserId}. Sincronizando...`, "success");
      
      await sincronizarComNuvemAoAbrir();
      
  
    } catch (err) {
      console.error("Erro de login:", err);
      toast("Erro ao conectar ao servidor.", 4000);
      setStatus("Erro de conexão.", "error");
    }
  }

  /* ====== sincronização inicial (busca encriptado e decripta) ====== */
async function sincronizarComNuvemAoAbrir(){
  if(!sessionToken){ setStatus("Sem sessão. Faça login.", ""); return; }
  setStatus("Sincronizando dados da nuvem...", "");
  try{
    const j = await apiGetData();
    if(j && j.data){
      try{
        const plain = await decryptJson(j.data);
        investimentos = Array.isArray(plain) ? plain : [];
        salvarCacheLocalEncrypted(j.data);
        render();
        setStatus("Dados sincronizados", "success");
      }catch(e){
        console.error("decrypt falhou", e);
        investimentos = [];
        render();
        setStatus("Não foi possível decriptar os dados (senha errada?).", "error");
        toast("Senha não corresponde aos dados criptografados. Faça login novamente.");
        showModal();
      }
    } else {
      // sem dados na nuvem: se tiver cache encriptado local e chave derivada, tenta carregar
      const cached = carregarCacheLocalEncrypted();
      if(cached && cryptoKey){
        try{
          investimentos = await decryptJson(cached);
          render();
          setStatus("Dados carregados do cache local", "success");
        }catch(e){ investimentos = []; render(); setStatus("Nenhum dado disponível", ""); }
      } else {
        investimentos = [];
        render();
        setStatus("Sem dados na nuvem.", "");
      }
    }
  }catch(e){ console.error(e); setStatus("Erro ao sincronizar", "error"); toast("Erro ao sincronizar com a nuvem"); }
}

/* ====== attach modal buttons & enter key handling ====== */
(function attachLoginHandlers(){
  
    function safe(id){ return document.getElementById(id); }

    function add(){
     
      
      /*const loginBtn = safe("modalLoginBtn"), cancelBtn = safe("modalCancelBtn"), userInput = safe("modalLoginUserId"), passInput = safe("modalLoginPassword");
      
      if(!loginBtn) return console.warn("#modalLoginBtn não encontrado");

      loginBtn.replaceWith(loginBtn.cloneNode(true));

      const fresh = safe("modalLoginBtn");

      fresh.addEventListener("click", async (e)=>{ e.preventDefault(); await fazerLoginModal(); });

      cancelBtn?.addEventListener("click", ()=>{*/  /*fechar tudo? apenas recarrega página para garantir  location.reload();*/ /*
        if(sessionToken){ 
          hideModal();
        }
      });
      passInput?.addEventListener("keydown", (ev)=>{ if(ev.key==="Enter"){ ev.preventDefault(); fresh.click(); }});
    }
    if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", add); else add();*/
  })();
